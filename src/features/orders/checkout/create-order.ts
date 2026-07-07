import crypto from "crypto";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createDokuCheckoutPayment } from "@/lib/doku";
import { AppError } from "@/lib/api-utils";
import { cacheGet, cacheSet } from "@/lib/redis";
import { generateOrderAccessToken } from "@/lib/order-access";
import { computePriceHash, buildPriceHashItems } from "@/lib/price-hash";
import type { CreateOrderInput } from "@/validations/order";
import { PAYMENT_EXPIRY_MINUTES } from "@/features/orders/payment/order-payment";

const sanitizeDokuText = (value: string) => {
  const sanitized = value.replace(/[^a-zA-Z0-9.\-/+,=_:'@% ]/g, " ").replace(/\s+/g, " ").trim();

  return sanitized || "Item";
};

const getCheckoutIdempotencyCacheKey = (tableId: string, checkoutId: string) =>
  `checkout:${tableId}:${checkoutId}`;

export async function createOrder(data: CreateOrderInput) {
  const { tableId, items, serviceType, serviceFee, rounding, priceHash, checkoutId } = data;
  const checkoutCacheKey = checkoutId ? getCheckoutIdempotencyCacheKey(tableId, checkoutId) : null;

  if (checkoutCacheKey) {
    const cachedOrderCode = await cacheGet<string>(checkoutCacheKey);

    if (cachedOrderCode) {
      const existingOrder = await prisma.order.findUnique({
        where: { orderCode: cachedOrderCode },
        include: {
          orderItems: {
            include: {
              menu: true,
              selectedOptions: true,
            },
          },
          table: true,
        },
      });

      if (existingOrder?.paymentStatus === PaymentStatus.PENDING && existingOrder.paymentRedirectUrl) {
        return {
          ...existingOrder,
          paymentRedirectUrl: existingOrder.paymentRedirectUrl,
          paymentGatewayOrderId: existingOrder.paymentGatewayOrderId ?? null,
        };
      }
    }
  }

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { id: true, isActive: true },
  });

  if (!table || !table.isActive) {
    throw new AppError("Meja tidak ditemukan atau tidak aktif.", 400);
  }

  const menuIds = items.map((item) => item.menuId);
  const menus = await prisma.menu.findMany({
    where: {
      id: {
        in: menuIds,
      },
    },
    include: {
      menuOptions: {
        include: {
          values: true,
        },
      },
    },
  });

  if (priceHash) {
    const menuMap = new Map(
      menus.map((m) => [m.id, m]),
    );

    const hashItems = buildPriceHashItems(
      items.map((item) => ({
        menuId: item.menuId,
        selectedOptions: (item.selectedOptions ?? []).map((opt) => ({
          valueId: opt.menuOptionValueId,
        })),
      })),
      menuMap as Map<string, { price: number; menuOptions: { values: { id: string; priceAdjust: number }[] }[] }>,
    );

    const activePriceHash = computePriceHash(hashItems);

    if (activePriceHash !== priceHash) {
      throw new AppError(
        "Harga menu telah berubah. Silakan kembali ke menu untuk memperbarui pesanan Anda.",
        409,
      );
    }
  }

  let totalAmount = 0;

  const processedItems = items.map((item) => {
    const menu = menus.find((candidate) => candidate.id === item.menuId);

    if (!menu || !menu.isActive || !menu.isAvailable) {
      throw new AppError(`Menu ${menu?.name ?? "tertentu"} sedang tidak tersedia`, 409);
    }

    const selectedValueIds = new Set(
      item.selectedOptions?.map((option) => option.menuOptionValueId) ?? [],
    );

    for (const option of menu.menuOptions) {
      if (
        option.isRequired &&
        !option.values.some((value) => selectedValueIds.has(value.id))
      ) {
        throw new AppError(`Opsi "${option.name}" wajib dipilih untuk ${menu.name}`, 400);
      }
    }

    const selectedOptions = (item.selectedOptions ?? []).map((selectedOption) => {
      const owningOption = menu.menuOptions.find((option) =>
        option.values.some((value) => value.id === selectedOption.menuOptionValueId),
      );

      const optionValue = owningOption?.values.find(
        (value) => value.id === selectedOption.menuOptionValueId,
      );

      if (!owningOption || !optionValue) {
        throw new AppError(`Opsi untuk ${menu.name} tidak valid`, 400);
      }

      return {
        optionName: owningOption.name,
        optionValue: optionValue.label,
        priceAdjust: optionValue.priceAdjust,
        menuOptionValueId: optionValue.id,
      };
    });

    const optionsTotal = selectedOptions.reduce(
      (accumulator, option) => accumulator + option.priceAdjust,
      0,
    );

    totalAmount += (menu.price + optionsTotal) * item.quantity;

    return {
      menuId: item.menuId,
      quantity: item.quantity,
      price: menu.price,
      notes: item.notes,
      selectedOptions,
    };
  });

  const SERVICE_FEE_RATE = 0.1;
  const ROUND_TO = 1000;
  const serverServiceFee = Math.round(totalAmount * SERVICE_FEE_RATE);
  const beforeRounding = totalAmount + serverServiceFee;
  const finalTotal = Math.round(beforeRounding / ROUND_TO) * ROUND_TO;
  const serverRounding = finalTotal - beforeRounding;

  if (serviceFee !== undefined && serviceFee !== serverServiceFee) {
    throw new AppError("Perhitungan biaya layanan tidak cocok. Silakan coba lagi.", 400);
  }

  if (rounding !== undefined && rounding !== serverRounding) {
    throw new AppError("Perhitungan pembulatan tidak cocok. Silakan coba lagi.", 400);
  }

  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomStr = crypto.randomBytes(3).toString("hex").toUpperCase();
  const orderCode = `GONKU-${dateStr}-${randomStr}`;
  const accessToken = generateOrderAccessToken();
  const paymentExpiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60_000);

  const order = await prisma.$transaction(async (tx) => {
    const lockKey = Buffer.from(tableId).reduce((h, b) => (h * 31 + b) | 0, 0);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    const recentOrder = await tx.order.findFirst({
      where: {
        tableId,
        status: OrderStatus.PENDING,
        createdAt: {
          gte: new Date(Date.now() - 15 * 1000),
        },
      },
    });

    if (recentOrder) {
      throw new AppError(
        "Harap tunggu beberapa detik sebelum membuat pesanan baru.",
        429,
      );
    }

    return tx.order.create({
      data: {
        orderCode,
        accessToken,
        tableId,
        totalAmount: finalTotal,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        serviceType,
        paymentExpiresAt,
        orderItems: {
          create: processedItems.map((item) => ({
            menuId: item.menuId,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes,
            selectedOptions: {
              create: item.selectedOptions,
            },
          })),
        },
      },
      include: {
        orderItems: {
          include: {
            menu: true,
            selectedOptions: true,
          },
        },
        table: true,
      },
    });
  });

  const paymentItems = order.orderItems.map((item) => ({
      id: item.menuId,
      price:
        item.price +
        item.selectedOptions.reduce(
          (accumulator, option) => accumulator + option.priceAdjust,
          0,
        ),
      quantity: item.quantity,
      name: sanitizeDokuText(item.menu.name).substring(0, 50),
    }));

    paymentItems.push({
      id: "SERVICE-FEE",
      price: serverServiceFee,
      quantity: 1,
      name: "Biaya Layanan dan Aplikasi",
    });

  if (serverRounding !== 0) {
    paymentItems.push({
      id: "ROUNDING",
      price: serverRounding,
      quantity: 1,
      name: "Pembulatan",
    });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const notificationUrl = process.env.DOKU_NOTIFICATION_URL;
    const callbackUrl = appUrl
      ? `${appUrl}/t/${encodeURIComponent(order.table.qrCode)}?order_id=${encodeURIComponent(orderCode)}`
      : undefined;

    const dokuPayment = await createDokuCheckoutPayment({
      order: {
        amount: finalTotal,
        invoice_number: orderCode,
        currency: "IDR",
        callback_url: callbackUrl,
        callback_url_result: callbackUrl,
        language: "ID",
        auto_redirect: true,
        line_items: paymentItems,
      },
      payment: {
        payment_due_date: 60,
        type: "SALE",
      },
      customer: {
        id: order.id,
        name: "Customer",
      },
      additional_info: notificationUrl
        ? {
            override_notification_url: notificationUrl,
          }
        : undefined,
    });

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        paymentRedirectUrl: dokuPayment.url,
        paymentGatewayOrderId: orderCode,
        paymentMethod: "doku_checkout",
      },
    });

    if (checkoutCacheKey) {
      await cacheSet(checkoutCacheKey, orderCode, 60 * 60);
    }

    return {
      ...order,
      paymentRedirectUrl: dokuPayment.url,
      paymentGatewayOrderId: orderCode,
    };
  } catch (error) {
    console.error("DOKU checkout failed", error);

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.FAILED,
      },
    });

    throw new AppError("Gagal memulai pembayaran. Silakan coba lagi.", 502);
  }
}

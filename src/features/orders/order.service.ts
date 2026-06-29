import * as Sentry from "@sentry/nextjs";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createDokuCheckoutPayment, getDokuOrderStatus } from "@/lib/doku";
import { supabaseAdmin, sendBroadcast } from "@/lib/supabase";
import { OWNER_DASHBOARD_CACHE_TAG } from "@/lib/cache-tags";
import { bumpCacheVersion, cacheGet, cacheSet } from "@/lib/redis";
import { REALTIME_CHANNELS } from "@/lib/realtime-channels";
import { getCafeDayRange, parseCafeLocalDateTime } from "@/lib/cafe-date";
import { AppError } from "@/lib/api-utils";
import type { CreateOrderInput } from "@/validations/order";
import { calculateOrderPriorityScore } from "@/features/orders/order-priority";
import { generateOrderAccessToken } from "@/lib/order-access";
import { computePriceHash, buildPriceHashItems } from "@/lib/price-hash";
import crypto from "crypto";

const ACTIVE_KITCHEN_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

const HISTORY_KITCHEN_STATUSES: OrderStatus[] = [
  OrderStatus.SERVED,
  OrderStatus.CANCELLED,
];

const ALLOWED_KITCHEN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CANCELLED],
  PAID: [OrderStatus.PREPARING],
  PREPARING: [OrderStatus.READY],
  READY: [OrderStatus.SERVED],
  SERVED: [],
  CANCELLED: [],
};

const sanitizeDokuText = (value: string) => {
  const sanitized = value.replace(/[^a-zA-Z0-9.\-/+,=_:'@% ]/g, " ").replace(/\s+/g, " ").trim();

  return sanitized || "Item";
};

const PAYMENT_EXPIRY_MINUTES = 60;

const getCheckoutIdempotencyCacheKey = (tableId: string, checkoutId: string) =>
  `checkout:${tableId}:${checkoutId}`;

function normalizeGatewayAmount(amount: string | number | undefined | null) {
  if (amount === undefined || amount === null) return null;

  const parsed = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function assertGatewayAmountMatches(
  gatewayAmount: string | number | undefined | null,
  orderAmount: number,
  options: { requireAmount?: boolean; orderCode?: string } = {},
) {
  const normalizedAmount = normalizeGatewayAmount(gatewayAmount);

  if (normalizedAmount === null) {
    if (options.requireAmount) {
      const error = new AppError("Payment amount is required for paid gateway update", 400);
      Sentry.captureException(error, {
        tags: { area: "payment", orderCode: options.orderCode ?? "unknown" },
      });
      throw error;
    }

    return;
  }

  if (normalizedAmount !== orderAmount) {
    const error = new AppError("Payment amount mismatch", 400);
    Sentry.captureException(error, {
      tags: { area: "payment", orderCode: options.orderCode ?? "unknown" },
      extra: { gatewayAmount: normalizedAmount, orderAmount },
    });
    throw error;
  }
}

const kitchenOrderSelect = {
  id: true,
  orderCode: true,
  status: true,
  paymentStatus: true,
  paidAt: true,
  createdAt: true,
  totalAmount: true,
  serviceType: true,
  priorityScore: true,
  table: {
    select: {
      id: true,
      tableNumber: true,
    },
  },
  orderItems: {
    select: {
      id: true,
      quantity: true,
      price: true,
      notes: true,
      menu: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
      selectedOptions: {
        select: {
          id: true,
          optionName: true,
          optionValue: true,
          priceAdjust: true,
        },
      },
    },
  },
} satisfies Prisma.OrderSelect;

const orderDetailsSelect = {
  id: true,
  orderCode: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  paymentRedirectUrl: true,
  totalAmount: true,
  createdAt: true,
  paymentExpiresAt: true,
  paidAt: true,
  serviceType: true,
  table: {
    select: {
      tableNumber: true,
    },
  },
  orderItems: {
    select: {
      id: true,
      quantity: true,
      price: true,
      notes: true,
      menu: {
        select: {
          name: true,
        },
      },
      selectedOptions: {
        select: {
          optionName: true,
          optionValue: true,
          priceAdjust: true,
        },
      },
    },
  },
} satisfies Prisma.OrderSelect;

type GatewayStatusPayload = {
  order_id?: string;
  transaction_status?: string;
  fraud_status?: string | null;
  payment_type?: string | null;
  settlement_time?: string | null;
  transaction_time?: string | null;
  payment_amounts?: Array<{ paid_at?: string | null }> | null;
  gross_amount?: string | number | null;
  order?: { amount?: string | number | null };
};

type GatewayUpdateSource = "webhook" | "check-payment" | "sync-payment" | "local-expire";

type GatewayUpdateContext = {
  source: GatewayUpdateSource;
  gateway: "doku" | "local";
};

function mapGatewayStatusToOrderState(payload: GatewayStatusPayload) {
  switch (payload.transaction_status) {
    case "capture":
      if (payload.fraud_status === "challenge") {
        return {
          paymentStatus: PaymentStatus.PENDING,
          orderStatus: OrderStatus.PENDING,
        };
      }

      return {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.PAID,
      };

    case "settlement":
    case "SUCCESS":
      return {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.PAID,
      };

    case "deny":
    case "cancel":
    case "FAILED":
      return {
        paymentStatus: PaymentStatus.FAILED,
        orderStatus: OrderStatus.CANCELLED,
      };

    case "expire":
    case "EXPIRED":
      return {
        paymentStatus: PaymentStatus.EXPIRED,
        orderStatus: OrderStatus.CANCELLED,
      };

    case "pending":
    case "PENDING":
    case "TIMEOUT":
    case "REDIRECT":
    default:
      return {
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.PENDING,
      };
  }
}

function resolveGatewayPaidAt(payload: GatewayStatusPayload) {
  return (
    parseCafeLocalDateTime(payload.payment_amounts?.[0]?.paid_at ?? null) ??
    parseCafeLocalDateTime(payload.settlement_time ?? null) ??
    parseCafeLocalDateTime(payload.transaction_time ?? null) ??
    null
  );
}

function assertKitchenStatusTransition(current: OrderStatus, next: OrderStatus) {
  const allowedStatuses = ALLOWED_KITCHEN_TRANSITIONS[current] ?? [];

  if (!allowedStatuses.includes(next)) {
    throw new AppError(`Invalid status transition from ${current} to ${next}`, 400);
  }
}

async function broadcastOrderStatus({
  orderCode,
  eventType,
  orderStatus,
  paymentStatus,
  fullOrder,
}: {
  orderCode: string;
  eventType: "payment.updated" | "order.status.updated";
  orderStatus: OrderStatus;
  paymentStatus?: PaymentStatus;
  fullOrder?: unknown;
}) {
  if (!supabaseAdmin) {
    return;
  }

  const payload = {
    eventType,
    orderCode,
    orderId: orderCode,
    orderStatus,
    paymentStatus,
    status: orderStatus,
    ...(fullOrder ? { fullOrder } : {}),
  };

  try {
    await Promise.all([
      sendBroadcast("refresh-orders", payload, REALTIME_CHANNELS.kitchenUpdates),
      sendBroadcast("refresh-orders", payload, REALTIME_CHANNELS.order(orderCode)),
    ]);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { area: "realtime", eventType },
      extra: { orderCode, orderStatus, paymentStatus },
    });

    console.error("[Realtime] Failed to broadcast order status", {
      orderCode,
      eventType,
      orderStatus,
      paymentStatus,
      error,
    });
  }
}

function revalidateOwnerDashboard() {
  revalidateTag(OWNER_DASHBOARD_CACHE_TAG, "max");
  void bumpCacheVersion("analytics");
}



export class OrderService {
  static async getOrders(includeServed: boolean) {
    const { start } = getCafeDayRange();

    const whereClause: Prisma.OrderWhereInput = includeServed
      ? {
          status: {
            in: HISTORY_KITCHEN_STATUSES,
          },
          updatedAt: {
            gte: start,
          },
        }
      : {
          status: {
            in: ACTIVE_KITCHEN_STATUSES,
          },
          paymentStatus: PaymentStatus.PAID,
        };

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: includeServed
        ? [{ updatedAt: "desc" }]
        : [{ paidAt: "asc" }, { createdAt: "asc" }],
      take: 50,
      select: kitchenOrderSelect,
    });

    if (includeServed) return orders;

    const now = new Date();
    return orders
      .map((order) => ({
        ...order,
        priorityScore: calculateOrderPriorityScore({
          paymentStatus: order.paymentStatus,
          paidAt: order.paidAt,
          serviceType: order.serviceType,
          orderItems: order.orderItems,
          now,
        }),
      }))
      .sort((first, second) => {
        if (second.priorityScore !== first.priorityScore) {
          return second.priorityScore - first.priorityScore;
        }

        return new Date(first.paidAt ?? first.createdAt).getTime() - new Date(second.paidAt ?? second.createdAt).getTime();
      });
  }

  static async getLatePaymentIssues(limit = 5) {
    return prisma.orderLog.findMany({
      where: {
        message: {
          startsWith: "Late payment ignored",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        message: true,
        createdAt: true,
        order: {
          select: {
            orderCode: true,
            totalAmount: true,
            paymentStatus: true,
            status: true,
            table: {
              select: {
                tableNumber: true,
              },
            },
          },
        },
      },
    });
  }

  static async getOrderByIdOrCode(idOrCode: string) {
    let order = await prisma.order.findUnique({
      where: { id: idOrCode },
      select: orderDetailsSelect,
    });

    if (!order) {
      order = await prisma.order.findUnique({
        where: { orderCode: idOrCode },
        select: orderDetailsSelect,
      });
    }

    return order ?? null;
  }

  static async createOrder(data: CreateOrderInput) {
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

  static async bulkUpdateOrderStatus(ids: string[], status: OrderStatus, userId: string) {
    const updatedOrders = [];

    for (const id of ids) {
      updatedOrders.push(await this.updateOrderStatus(id, status, userId));
    }

    return updatedOrders;
  }

  static async updateOrderStatus(id: string, status: OrderStatus, userId: string) {
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        orderCode: true,
      },
    });

    if (!existingOrder) {
      throw new AppError("Order not found", 404);
    }

    assertKitchenStatusTransition(existingOrder.status, status);

    const { count } = await prisma.order.updateMany({
      where: { id, status: existingOrder.status },
      data: { status },
    });

    if (count === 0) {
      throw new AppError("Status pesanan sudah berubah. Silakan refresh halaman.", 409);
    }

    const updatedOrder = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
          },
        },
        orderItems: {
          include: {
            menu: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
            selectedOptions: true,
          },
        },
      },
    });

    await prisma.orderLog.create({
      data: {
        orderId: id,
        status,
        message: `Order status updated to ${status}`,
        createdBy: userId,
      },
    });

    await broadcastOrderStatus({
      orderCode: existingOrder.orderCode,
      eventType: "order.status.updated",
      orderStatus: status,
    });

    return updatedOrder;
  }

  static async applyGatewayPaymentUpdate(
    order: {
      id: string;
      orderCode: string;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      paymentMethod: string | null;
      paidAt: Date | null;
      totalAmount?: number;
      createdAt?: Date;
      paymentExpiresAt?: Date | null;
      serviceType?: "DINE_IN" | "TAKEAWAY" | null;
    },
    gatewayPayload: GatewayStatusPayload,
    context: GatewayUpdateContext,
  ) {
    const nextState = mapGatewayStatusToOrderState(gatewayPayload);

    if (order.totalAmount !== undefined) {
      assertGatewayAmountMatches(
        gatewayPayload.gross_amount ?? gatewayPayload.order?.amount,
        order.totalAmount,
        {
          requireAmount: nextState.paymentStatus === PaymentStatus.PAID,
          orderCode: order.orderCode,
        },
      );
    }

    const nextPaidAt = resolveGatewayPaidAt(gatewayPayload) ?? new Date();
    const paymentExpiredAt = order.paymentExpiresAt ?? (order.createdAt
      ? new Date(order.createdAt.getTime() + PAYMENT_EXPIRY_MINUTES * 60_000)
      : null);

    if (
      order.paymentStatus !== PaymentStatus.PAID &&
      nextState.paymentStatus === PaymentStatus.PAID &&
      paymentExpiredAt &&
      nextPaidAt > paymentExpiredAt
    ) {
      await prisma.orderLog.create({
        data: {
          orderId: order.id,
          status: order.status,
          message: `Late payment ignored via ${gatewayPayload.payment_type ?? context.gateway} (${context.source}). Paid at ${nextPaidAt.toISOString()}, expired at ${paymentExpiredAt.toISOString()}`,
        },
      });

      Sentry.captureMessage("Late payment ignored after expiry", {
        level: "warning",
        tags: { area: "payment", gateway: context.gateway, source: context.source },
        extra: {
          orderCode: order.orderCode,
          paidAt: nextPaidAt.toISOString(),
          expiredAt: paymentExpiredAt.toISOString(),
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
        },
      });

      return {
        status: order.paymentStatus,
        updated: false,
        latePayment: true,
        message: "Ignoring late payment after expiry",
      };
    }

    if (
      order.status === OrderStatus.CANCELLED &&
      order.paymentStatus !== PaymentStatus.PAID &&
      nextState.paymentStatus === PaymentStatus.PAID
    ) {
      await prisma.orderLog.create({
        data: {
          orderId: order.id,
          status: order.status,
          message: `Ignored late payment after cancellation via ${gatewayPayload.payment_type ?? context.gateway} (${context.source})`,
        },
      });

      return {
        status: order.paymentStatus,
        updated: false,
        message: "Ignoring payment after cancellation",
      };
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      if (nextState.paymentStatus !== PaymentStatus.PAID) {
        return {
          status: order.paymentStatus,
          updated: false,
          message: "Ignoring stale non-paid update after payment confirmation",
        };
      }

      if (order.paidAt) {
        return {
          status: order.paymentStatus,
          updated: false,
          message: "Payment already confirmed",
        };
      }
    }

    if (
      order.paymentStatus === nextState.paymentStatus &&
      order.status === nextState.orderStatus &&
      (nextState.paymentStatus !== PaymentStatus.PAID || Boolean(order.paidAt))
    ) {
      return {
        status: nextState.paymentStatus,
        updated: false,
        message: "Status same as database",
      };
    }

    const shouldPreserveKitchenStatus =
      order.paymentStatus === PaymentStatus.PAID &&
      nextState.paymentStatus === PaymentStatus.PAID;

    const { count } = await prisma.order.updateMany({
      where: {
        id: order.id,
        paymentStatus: order.paymentStatus,
      },
      data: {
        paymentStatus: nextState.paymentStatus,
        status: shouldPreserveKitchenStatus
          ? order.status
          : nextState.paymentStatus === PaymentStatus.PAID
            ? OrderStatus.PAID
            : nextState.orderStatus,
        paidAt:
          nextState.paymentStatus === PaymentStatus.PAID
            ? order.paidAt ?? nextPaidAt
            : order.paidAt,
        paymentMethod: gatewayPayload.payment_type ?? order.paymentMethod,
        priorityScore: nextState.paymentStatus === PaymentStatus.PAID
          ? calculateOrderPriorityScore({
              paymentStatus: nextState.paymentStatus,
              paidAt: order.paidAt ?? nextPaidAt,
              serviceType: order.serviceType,
            })
          : order.paymentStatus === PaymentStatus.PAID
            ? undefined
            : 0,
      },
    });

    if (count === 0) {
      return {
        status: nextState.paymentStatus,
        updated: false,
        message: "Status already updated by another process",
      };
    }

    const updatedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: kitchenOrderSelect,
    });

    await prisma.orderLog.create({
      data: {
        orderId: order.id,
        status: updatedOrder.status,
        message:
          nextState.paymentStatus === PaymentStatus.PAID
            ? `Payment confirmed via ${gatewayPayload.payment_type ?? context.gateway} (${context.source})`
            : `Payment updated to ${nextState.paymentStatus} via ${context.gateway} (${context.source})`,
      },
    });

    await broadcastOrderStatus({
      orderCode: order.orderCode,
      eventType: "payment.updated",
      orderStatus: updatedOrder.status,
      paymentStatus: nextState.paymentStatus,
      fullOrder: nextState.paymentStatus === PaymentStatus.PAID ? updatedOrder : undefined,
    });

    revalidateOwnerDashboard();

    return {
      status: nextState.paymentStatus,
      updated: true,
      message: `Status updated to ${nextState.paymentStatus}`,
      order: updatedOrder,
    };
  }


  static async handleDokuNotification(payload: {
    order?: { invoice_number?: string; amount?: number };
    transaction?: { status?: string; date?: string; original_request_id?: string };
    channel?: { id?: string };
    service?: { id?: string };
    invoice_number?: string;
    transaction_status?: string;
  }) {
    const invoiceNumber = payload.order?.invoice_number ?? payload.invoice_number;

    if (!invoiceNumber) {
      throw new AppError("Invoice number is required", 400);
    }

    const order = await prisma.order.findUnique({
      where: {
        orderCode: invoiceNumber,
      },
      select: {
        id: true,
        orderCode: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        paidAt: true,
        totalAmount: true,
        createdAt: true,
        paymentExpiresAt: true,
        serviceType: true,
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const dokuStatus = payload.transaction?.status ?? payload.transaction_status ?? "PENDING";

    return this.applyGatewayPaymentUpdate(order, {
      transaction_status: dokuStatus.toUpperCase(),
      payment_type: payload.channel?.id ?? payload.service?.id ?? "doku_checkout",
      transaction_time: payload.transaction?.date ?? null,
      order: {
        amount: payload.order?.amount,
      },
    }, {
      gateway: "doku",
      source: "webhook",
    });
  }

  static async checkPaymentStatus(idOrCode: string) {
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: idOrCode }, { orderCode: idOrCode }],
      },
      select: {
        id: true,
        orderCode: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        paidAt: true,
        totalAmount: true,
        createdAt: true,
        paymentExpiresAt: true,
        serviceType: true,
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      await broadcastOrderStatus({
        orderCode: order.orderCode,
        eventType: "payment.updated",
        orderStatus: order.status,
        paymentStatus: PaymentStatus.PAID,
      });

      return { status: PaymentStatus.PAID, message: "Already paid", updated: false };
    }

    try {
      const statusResponse = await getDokuOrderStatus(order.orderCode);

      return this.applyGatewayPaymentUpdate(order, {
        transaction_status: statusResponse.transaction?.status ?? "PENDING",
        payment_type: statusResponse.channel?.id ?? statusResponse.service?.id ?? order.paymentMethod ?? "doku_checkout",
        transaction_time: statusResponse.transaction?.date ?? null,
        order: {
          amount: statusResponse.order?.amount,
        },
      }, {
        gateway: "doku",
        source: "check-payment",
      });
    } catch (error) {
      console.error("DOKU check status failed", error);

      return {
        status: order.paymentStatus,
        updated: false,
        message: "Payment status is waiting for DOKU notification",
      };
    }
  }

  static async cancelOrder(idOrCode: string) {
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id: idOrCode },
          { orderCode: idOrCode }
        ]
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        orderCode: true,
      },
    });

    if (!existingOrder) {
      throw new AppError("Order not found", 404);
    }

    if (
      existingOrder.status !== OrderStatus.PENDING ||
      existingOrder.paymentStatus !== PaymentStatus.PENDING
    ) {
      const error = new Error(
        "Pesanan tidak dapat dibatalkan (Sudah dibayar atau diproses).",
      ) as Error & { status?: number };
      error.status = 400;
      throw error;
    }

    const { count } = await prisma.order.updateMany({
      where: {
        id: existingOrder.id,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      },
      data: {
        status: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.FAILED,
      },
    });

    if (count === 0) {
      throw new AppError("Pesanan sudah berubah. Silakan refresh halaman.", 409);
    }

    const updatedOrder = await prisma.order.findUniqueOrThrow({
      where: {
        id: existingOrder.id,
      },
    });

    await prisma.orderLog.create({
      data: {
        orderId: existingOrder.id,
        status: OrderStatus.CANCELLED,
        message: "Order cancelled by customer",
      },
    });

    await broadcastOrderStatus({
      orderCode: existingOrder.orderCode,
      eventType: "order.status.updated",
      orderStatus: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.FAILED,
    });

    return updatedOrder;
  }

  static async syncPendingPayments() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const pendingOrders = await prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PENDING,
        createdAt: {
          gte: twoDaysAgo,
        },
      },
      take: 20,
      select: {
        id: true,
        orderCode: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        paidAt: true,
        totalAmount: true,
        createdAt: true,
        paymentExpiresAt: true,
        serviceType: true,
      },
    });

    if (!pendingOrders.length) {
      return { totalChecked: 0, updatedCount: 0, details: [] };
    }

    let updatedCount = 0;
    const now = new Date();

    const details = await Promise.all(
      pendingOrders.map(async (order) => {
        const ageMinutes = (now.getTime() - new Date(order.createdAt).getTime()) / 60_000;

        try {
          const statusResponse = await getDokuOrderStatus(order.orderCode);
          const result = await this.applyGatewayPaymentUpdate(order, {
            transaction_status: statusResponse.transaction?.status ?? "PENDING",
            payment_type: statusResponse.channel?.id ?? statusResponse.service?.id ?? order.paymentMethod ?? "doku_checkout",
            transaction_time: statusResponse.transaction?.date ?? null,
            order: {
              amount: statusResponse.order?.amount,
            },
          }, {
            gateway: "doku",
            source: "sync-payment",
          });

          if (result.updated) {
            updatedCount += 1;
          }

          return {
            orderId: order.orderCode,
            status: result.status,
            updated: result.updated,
            source: "doku",
          };
        } catch (error) {
          console.error("DOKU pending sync failed", { orderCode: order.orderCode, error });

          if (ageMinutes > 60) {
            const result = await this.applyGatewayPaymentUpdate(order, {
              transaction_status: "expire",
            }, {
              gateway: "local",
              source: "local-expire",
            });

            if (result.updated) {
              updatedCount += 1;
            }

            return {
              orderId: order.orderCode,
              status: result.status,
              updated: result.updated,
              source: "local-expire",
            };
          }

          return {
            orderId: order.orderCode,
            status: order.paymentStatus,
            updated: false,
            source: "doku-error",
          };
        }
      }),
    );

    return {
      totalChecked: pendingOrders.length,
      updatedCount,
      details,
    };
  }
}

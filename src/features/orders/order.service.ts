import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";
import { supabaseAdmin, sendBroadcast } from "@/lib/supabase";
import { ADMIN_DASHBOARD_CACHE_TAG } from "@/lib/cache-tags";
import { bumpCacheVersion } from "@/lib/redis";
import { REALTIME_CHANNELS } from "@/lib/realtime-channels";
import { getCafeDayRange, parseCafeLocalDateTime } from "@/lib/cafe-date";
import type { CreateOrderInput } from "@/validations/order";

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

const kitchenOrderSelect = {
  id: true,
  orderCode: true,
  status: true,
  paidAt: true,
  createdAt: true,
  totalAmount: true,
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
  midtransToken: true,
  totalAmount: true,
  createdAt: true,
  paidAt: true,
  customerName: true,
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
      return {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.PAID,
      };

    case "deny":
    case "cancel":
      return {
        paymentStatus: PaymentStatus.FAILED,
        orderStatus: OrderStatus.CANCELLED,
      };

    case "expire":
      return {
        paymentStatus: PaymentStatus.EXPIRED,
        orderStatus: OrderStatus.CANCELLED,
      };

    case "pending":
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
    throw new Error(`Invalid status transition from ${current} to ${next}`);
  }
}

async function broadcastOrderStatus(
  orderCode: string,
  status: string,
  fullOrder?: unknown,
) {
  if (!supabaseAdmin) {
    return;
  }

  await Promise.all([
    sendBroadcast(
      "refresh-orders",
      {
        orderId: orderCode,
        status,
        ...(fullOrder ? { fullOrder } : {}),
      },
      REALTIME_CHANNELS.kitchenUpdates,
    ),
    sendBroadcast(
      "refresh-orders",
      { orderId: orderCode, status },
      REALTIME_CHANNELS.order(orderCode),
    ),
  ]);
}

function revalidateAdminDashboard() {
  revalidateTag(ADMIN_DASHBOARD_CACHE_TAG, "max");
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

    return prisma.order.findMany({
      where: whereClause,
      orderBy: includeServed
        ? [{ updatedAt: "desc" }]
        : [{ paidAt: "asc" }, { createdAt: "asc" }],
      take: 50,
      select: kitchenOrderSelect,
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

    return order;
  }

  static async createOrder(data: CreateOrderInput) {
    const { tableId, items, customerName, customerPhone, serviceFee, rounding } = data;

    const recentOrder = await prisma.order.findFirst({
      where: {
        tableId,
        status: OrderStatus.PENDING,
        createdAt: {
          gte: new Date(Date.now() - 15 * 1000), // 15 seconds debounce
        },
      },
    });

    if (recentOrder) {
      throw new Error(
        "Harap tunggu beberapa detik sebelum membuat pesanan baru.",
      );
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

    let totalAmount = 0;

    const processedItems = items.map((item) => {
      const menu = menus.find((candidate) => candidate.id === item.menuId);

      if (!menu || !menu.isActive || !menu.isAvailable) {
        throw new Error(`Menu ${menu?.name ?? "tertentu"} sedang tidak tersedia`);
      }

      const selectedValueIds = new Set(
        item.selectedOptions?.map((option) => option.menuOptionValueId) ?? [],
      );

      for (const option of menu.menuOptions) {
        if (
          option.isRequired &&
          !option.values.some((value) => selectedValueIds.has(value.id))
        ) {
          throw new Error(`Opsi "${option.name}" wajib dipilih untuk ${menu.name}`);
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
          throw new Error(`Opsi untuk ${menu.name} tidak valid`);
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
      throw new Error("Perhitungan biaya layanan tidak cocok. Silakan coba lagi.");
    }

    if (rounding !== undefined && rounding !== serverRounding) {
      throw new Error("Perhitungan pembulatan tidak cocok. Silakan coba lagi.");
    }

    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderCode = `GONKU-${dateStr}-${randomStr}`;

    const order = await prisma.order.create({
      data: {
        orderCode,
        tableId,
        customerName,
        customerPhone,
        totalAmount: finalTotal,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
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

    try {
      const midtransItems = order.orderItems.map((item) => ({
        id: item.menuId,
        price:
          item.price +
          item.selectedOptions.reduce(
            (accumulator, option) => accumulator + option.priceAdjust,
            0,
          ),
        quantity: item.quantity,
        name: item.menu.name.substring(0, 50),
      }));

      midtransItems.push({
        id: "SERVICE-FEE",
        price: serverServiceFee,
        quantity: 1,
        name: "Biaya Layanan & Aplikasi",
      });

      if (serverRounding !== 0) {
        midtransItems.push({
          id: "ROUNDING",
          price: serverRounding,
          quantity: 1,
          name: "Pembulatan",
        });
      }

      const transaction = await snap.createTransaction({
        transaction_details: {
          order_id: orderCode,
          gross_amount: finalTotal,
        },
        item_details: midtransItems,
        customer_details: {
          first_name: customerName?.trim() || "Customer",
          last_name: `#${orderCode}`,
          phone: customerPhone?.trim() || undefined,
        },
      });

      await prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          midtransToken: transaction.token,
          midtransOrderId: orderCode,
        },
      });

      return {
        ...order,
        midtransToken: transaction.token,
        midtransRedirectUrl: transaction.redirect_url,
      };
    } catch {
      await prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
        },
      });

      throw new Error("Gagal memulai pembayaran. Silakan coba lagi.");
    }
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
      throw new Error("Order not found");
    }

    assertKitchenStatusTransition(existingOrder.status, status);

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
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

    await broadcastOrderStatus(existingOrder.orderCode, status);

    return updatedOrder;
  }

  private static async applyGatewayUpdate(
    order: {
      id: string;
      orderCode: string;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      paymentMethod: string | null;
      paidAt: Date | null;
    },
    gatewayPayload: GatewayStatusPayload,
  ) {
    const nextState = mapGatewayStatusToOrderState(gatewayPayload);
    const nextPaidAt = resolveGatewayPaidAt(gatewayPayload) ?? new Date();

    if (
      order.paymentStatus === PaymentStatus.PAID &&
      nextState.paymentStatus !== PaymentStatus.PAID
    ) {
      return {
        status: order.paymentStatus,
        updated: false,
        message: "Ignoring stale non-paid update after payment confirmation",
      };
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

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: nextState.paymentStatus,
        status:
          nextState.paymentStatus === PaymentStatus.PAID
            ? OrderStatus.PAID
            : nextState.orderStatus,
        paidAt:
          nextState.paymentStatus === PaymentStatus.PAID
            ? order.paidAt ?? nextPaidAt
            : order.paidAt,
        paymentMethod: gatewayPayload.payment_type ?? order.paymentMethod,
      },
      select: kitchenOrderSelect,
    });

    await prisma.orderLog.create({
      data: {
        orderId: order.id,
        status: updatedOrder.status,
        message:
          nextState.paymentStatus === PaymentStatus.PAID
            ? `Payment confirmed via ${gatewayPayload.payment_type ?? "midtrans"}`
            : `Payment updated to ${nextState.paymentStatus}`,
      },
    });

    await broadcastOrderStatus(
      order.orderCode,
      nextState.paymentStatus,
      nextState.paymentStatus === PaymentStatus.PAID ? updatedOrder : undefined,
    );

    revalidateAdminDashboard();

    return {
      status: nextState.paymentStatus,
      updated: true,
      message: `Status updated to ${nextState.paymentStatus}`,
      order: updatedOrder,
    };
  }

  static async handleMidtransNotification(payload: GatewayStatusPayload & { order_id: string }) {
    const order = await prisma.order.findUnique({
      where: {
        orderCode: payload.order_id,
      },
      select: {
        id: true,
        orderCode: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        paidAt: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    return this.applyGatewayUpdate(order, payload);
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
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      await broadcastOrderStatus(order.orderCode, PaymentStatus.PAID);

      return { status: PaymentStatus.PAID, message: "Already paid", updated: false };
    }

    try {
      const statusResponse = await (snap as never as {
        transaction: { status: (orderId: string) => Promise<GatewayStatusPayload> };
      }).transaction.status(order.orderCode);

      return this.applyGatewayUpdate(order, statusResponse);
    } catch (error: unknown) {
      const midtransError = error as { httpStatusCode?: number; status_code?: string };

      if (
        midtransError?.httpStatusCode === 404 ||
        midtransError?.status_code === "404"
      ) {
        return {
          status: PaymentStatus.PENDING,
          updated: false,
          message: "Transaction not found in Midtrans yet",
        };
      }

      throw error;
    }
  }

  static async cancelOrder(idOrCode: string) {
    const existingOrder = await prisma.order.findFirst({
      where: {
        orderCode: idOrCode,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        orderCode: true,
      },
    });

    if (!existingOrder) {
      throw new Error("Order not found");
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

    const updatedOrder = await prisma.order.update({
      where: {
        id: existingOrder.id,
      },
      data: {
        status: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.FAILED,
      },
    });

    await broadcastOrderStatus(existingOrder.orderCode, OrderStatus.CANCELLED);

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
      },
    });

    if (!pendingOrders.length) {
      return { totalChecked: 0, updatedCount: 0, details: [] };
    }

    let updatedCount = 0;

    const details = await Promise.all(
      pendingOrders.map(async (order) => {
        try {
          const statusResponse = await (snap as never as {
            transaction: { status: (orderId: string) => Promise<GatewayStatusPayload> };
          }).transaction.status(order.orderCode);

          const result = await this.applyGatewayUpdate(order, statusResponse);

          if (result.updated) {
            updatedCount += 1;
          }

          return {
            orderId: order.orderCode,
            status: result.status,
            updated: result.updated,
          };
        } catch (error: unknown) {
          const midtransError = error as { httpStatusCode?: number; status_code?: string };

          if (
            midtransError?.httpStatusCode === 404 ||
            midtransError?.status_code === "404"
          ) {
            return {
              orderId: order.orderCode,
              error: "Not found in Midtrans",
            };
          }

          return {
            orderId: order.orderCode,
            error: "Check failed",
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

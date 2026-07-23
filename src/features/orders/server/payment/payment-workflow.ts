import * as Sentry from "@sentry/nextjs";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getDokuOrderStatus } from "@/server/payment/doku";
import { AppError } from "@/server/http/api-utils";
import { calculateOrderPriorityScore } from "@/features/orders/server/priority-queue/order-priority";
import { kitchenOrderSelect } from "@/features/orders/server/order.select";
import { broadcastOrderStatus, revalidateOwnerDashboard } from "@/features/orders/server/order-events";
import {
  PAYMENT_EXPIRY_MINUTES,
  type GatewayStatusPayload,
  type GatewayUpdateContext,
  assertGatewayAmountMatches,
  mapGatewayStatusToOrderState,
  resolveGatewayPaidAt,
} from "@/features/orders/server/payment/order-payment";

export async function getLatePaymentIssues(limit = 5) {
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

// Proses status dari payment gateway lalu update order.
export async function applyGatewayPaymentUpdate(
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

  // Ambil waktu bayar dari gateway; dipakai sebagai paidAt order.
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
      // paidAt jadi waktu mulai antrean kitchen.
      paidAt:
        nextState.paymentStatus === PaymentStatus.PAID
          ? order.paidAt ?? nextPaidAt
          : order.paidAt,
      paymentMethod: gatewayPayload.payment_type ?? order.paymentMethod,
      // Score awal disimpan setelah order lolos pembayaran.
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


// Webhook DOKU masuk ke sini untuk dicocokkan dengan orderCode.
export async function handleDokuNotification(payload: {
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

  return applyGatewayPaymentUpdate(order, {
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

export async function checkPaymentStatus(idOrCode: string) {
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

    return applyGatewayPaymentUpdate(order, {
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

export async function syncPendingPayments() {
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
        const result = await applyGatewayPaymentUpdate(order, {
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
          const result = await applyGatewayPaymentUpdate(order, {
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

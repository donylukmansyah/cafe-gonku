import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getCafeDayRange } from "@/shared/cafe-date";
import { AppError } from "@/server/http/api-utils";
import { kitchenOrderSelect } from "@/features/orders/server/order.select";
import { calculateOrderPriorityScore } from "@/features/orders/server/priority-queue/order-priority";

// Status aktif yang tampil di kitchen queue.
export const ACTIVE_KITCHEN_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

export const HISTORY_KITCHEN_STATUSES: OrderStatus[] = [
  OrderStatus.SERVED,
  OrderStatus.CANCELLED,
];

export const ALLOWED_KITCHEN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CANCELLED],
  PAID: [OrderStatus.PREPARING],
  PREPARING: [OrderStatus.READY],
  READY: [OrderStatus.SERVED],
  SERVED: [],
  CANCELLED: [],
};

export function assertKitchenStatusTransition(current: OrderStatus, next: OrderStatus) {
  const allowedStatuses = ALLOWED_KITCHEN_TRANSITIONS[current] ?? [];

  if (!allowedStatuses.includes(next)) {
    throw new AppError(`Invalid status transition from ${current} to ${next}`, 400);
  }
}

export async function getKitchenOrders(includeServed: boolean) {
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
        // Gerbang priority queue: hanya order PAID yang boleh tampil di kitchen.
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
    // Hitung ulang score di sini karena waktu tunggu terus bertambah.
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
      // Urutan utama: priorityScore terbesar tampil paling atas.
      if (second.priorityScore !== first.priorityScore) {
        return second.priorityScore - first.priorityScore;
      }

      // Jika score sama, order yang lebih dulu dibayar diproses lebih dulu.
      return new Date(first.paidAt ?? first.createdAt).getTime() - new Date(second.paidAt ?? second.createdAt).getTime();
    });
}

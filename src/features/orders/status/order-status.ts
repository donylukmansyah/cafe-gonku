import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-utils";
import { assertKitchenStatusTransition } from "@/features/orders/kitchen-queue/kitchen-queue";
import { broadcastOrderStatus } from "@/features/orders/order-events";

export async function bulkUpdateOrderStatus(ids: string[], status: OrderStatus, userId: string) {
  const updatedOrders = [];

  for (const id of ids) {
    updatedOrders.push(await updateOrderStatus(id, status, userId));
  }

  return updatedOrders;
}

export async function updateOrderStatus(id: string, status: OrderStatus, userId: string) {
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

export async function cancelOrder(idOrCode: string) {
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

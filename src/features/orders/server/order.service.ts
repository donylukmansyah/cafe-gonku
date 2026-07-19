import { prisma } from "@/server/db/prisma";
import { orderDetailsSelect } from "@/features/orders/server/order.select";
import { getKitchenOrders } from "@/features/orders/server/kitchen-queue/kitchen-queue";
import { createOrder } from "@/features/orders/server/checkout/create-order";
import { bulkUpdateOrderStatus, cancelOrder, updateOrderStatus } from "@/features/orders/server/status/order-status";
import {
  applyGatewayPaymentUpdate,
  checkPaymentStatus,
  getLatePaymentIssues,
  handleDokuNotification,
  syncPendingPayments,
} from "@/features/orders/server/payment/payment-workflow";

export class OrderService {
  static getOrders = getKitchenOrders;
  static getLatePaymentIssues = getLatePaymentIssues;
  static createOrder = createOrder;
  static bulkUpdateOrderStatus = bulkUpdateOrderStatus;
  static updateOrderStatus = updateOrderStatus;
  static applyGatewayPaymentUpdate = applyGatewayPaymentUpdate;
  static handleDokuNotification = handleDokuNotification;
  static checkPaymentStatus = checkPaymentStatus;
  static cancelOrder = cancelOrder;
  static syncPendingPayments = syncPendingPayments;

  static async getOrderByIdOrCode(idOrCode: string) {
    return (
      await prisma.order.findUnique({ where: { id: idOrCode }, select: orderDetailsSelect }) ??
      await prisma.order.findUnique({ where: { orderCode: idOrCode }, select: orderDetailsSelect })
    );
  }
}

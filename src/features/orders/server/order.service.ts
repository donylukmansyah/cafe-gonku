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

// Facade agar route lama tetap memanggil OrderService.
export class OrderService {
  static getOrders = getKitchenOrders; // Ambil antrean kitchen yang sudah di-sort priority queue.
  static getLatePaymentIssues = getLatePaymentIssues;
  static createOrder = createOrder; // Buat order awal dari checkout customer.
  static bulkUpdateOrderStatus = bulkUpdateOrderStatus;
  static updateOrderStatus = updateOrderStatus;
  static applyGatewayPaymentUpdate = applyGatewayPaymentUpdate;
  static handleDokuNotification = handleDokuNotification; // Terima webhook DOKU setelah pembayaran.
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

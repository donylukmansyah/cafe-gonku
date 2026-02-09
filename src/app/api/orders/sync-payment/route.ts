import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";
import { supabaseAdmin } from "@/lib/supabase";
import { apiResponse, handleApiError } from "@/lib/api-utils";

// POST /api/orders/sync-payment
// Bulk check for all PENDING orders to update their status from Midtrans
export async function POST(request: Request) {
    try {
        // 1. Get all PENDING orders from the last 24 hours
        // We don't want to check very old orders that are likely abandoned
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const pendingOrders = await prisma.order.findMany({
            where: {
                paymentStatus: "PENDING",
                createdAt: { gte: yesterday },
            },
            take: 20 // Limit batch size for safety
        });

        if (pendingOrders.length === 0) {
            return apiResponse({ message: "No pending orders to sync", updatedCount: 0 });
        }

        let updatedCount = 0;

        // 2. Process in parallel
        const checkPromises = pendingOrders.map(async (order) => {
            try {
                const statusResponse = await (snap as any).transaction.status(order.orderCode);
                const { transaction_status, fraud_status, payment_type } = statusResponse;

                let paymentStatus: "PENDING" | "PAID" | "FAILED" | "EXPIRED" = "PENDING";
                let orderStatus: "PENDING" | "PAID" | "CANCELLED" = "PENDING";

                switch (transaction_status) {
                    case "capture":
                        if (fraud_status === "challenge") {
                            paymentStatus = "PENDING";
                        } else {
                            paymentStatus = "PAID";
                            orderStatus = "PAID";
                        }
                        break;
                    case "settlement":
                        paymentStatus = "PAID";
                        orderStatus = "PAID";
                        break;
                    case "pending":
                        paymentStatus = "PENDING";
                        break;
                    case "deny":
                    case "cancel":
                        paymentStatus = "FAILED";
                        orderStatus = "CANCELLED";
                        break;
                    case "expire":
                        paymentStatus = "EXPIRED";
                        orderStatus = "CANCELLED";
                        break;
                }

                if (paymentStatus !== "PENDING" && paymentStatus !== order.paymentStatus) {
                    // Update DB
                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            paymentStatus: paymentStatus as any,
                            status: (paymentStatus === "PAID" ? "PAID" : orderStatus) as any,
                            paidAt: paymentStatus === "PAID" ? new Date() : null,
                            paymentMethod: payment_type || order.paymentMethod
                        }
                    });

                    if (supabaseAdmin) {
                        const payload = { orderId: order.orderCode, status: paymentStatus };
                        const lib = await import("@/lib/supabase");
                        await Promise.all([
                            lib.sendBroadcast("refresh-orders", payload, `order-${order.orderCode}`),
                            lib.sendBroadcast("refresh-orders", payload, "kitchen-updates")
                        ]);
                    }
                    updatedCount++;
                    return { orderId: order.orderCode, status: paymentStatus, updated: true };
                }

                return { orderId: order.orderCode, status: "PENDING", updated: false };

            } catch (error: any) {
                // Ignore 404s (transaction not created yet)
                if (error.httpStatusCode == 404 || error.status_code == "404") {
                    return { orderId: order.orderCode, error: "Not found in Midtrans" };
                }
                console.error(`Error checking order ${order.orderCode}:`, error);
                return { orderId: order.orderCode, error: "Check failed" };
            }
        });

        const checks = await Promise.all(checkPromises);

        return apiResponse({
            message: "Sync completed",
            totalChecked: pendingOrders.length,
            updatedCount,
            details: checks
        });

    } catch (error) {
        return handleApiError(error, "POST /api/orders/sync-payment");
    }
}

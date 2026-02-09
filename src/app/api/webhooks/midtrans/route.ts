import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";

// POST /api/webhooks/midtrans
export async function GET() {
    return apiResponse({ message: "Webhook endpoint is alive" });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Extract Variables
        const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status, payment_type } = body;

        // 2. Verify Signature Key
        const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
        const input = order_id + status_code + gross_amount + serverKey;
        const signature = crypto.createHash("sha512").update(input).digest("hex");

        if (signature !== signature_key) {
            // Fallback: Try with .00 removed
            const amountInt = gross_amount.toString().split('.')[0];
            const input2 = order_id + status_code + amountInt + serverKey;
            const signature2 = crypto.createHash("sha512").update(input2).digest("hex");

            if (signature2 !== signature_key) {
                return apiError("Invalid signature", 403);
            }
        }

        // 3. Determine Status Mapping
        const statusMap: Record<string, { payment: any; order: any }> = {
            capture: {
                payment: fraud_status === "challenge" ? "PENDING" : "PAID",
                order: fraud_status === "challenge" ? "PENDING" : "PAID"
            },
            settlement: { payment: "PAID", order: "PAID" },
            pending: { payment: "PENDING", order: "PENDING" },
            deny: { payment: "FAILED", order: "CANCELLED" },
            cancel: { payment: "FAILED", order: "CANCELLED" },
            expire: { payment: "EXPIRED", order: "CANCELLED" },
        };

        const result = statusMap[transaction_status] || { payment: "PENDING", order: "PENDING" };
        const { payment: paymentStatus, order: orderStatus } = result;

        console.log(`[Webhook] Order: ${order_id} | Status: ${transaction_status} | Final: ${paymentStatus}/${orderStatus}`);

        // 4. Update Database (Idempotent update)
        const updatedOrder = await prisma.order.update({
            where: { orderCode: order_id },
            data: {
                paymentStatus: paymentStatus,
                status: (paymentStatus === "PAID" ? "PAID" : orderStatus),
                paidAt: paymentStatus === "PAID" ? new Date() : null,
                paymentMethod: payment_type
            }
        });

        // 5. Notify Real-time
        const { sendBroadcast } = await import("@/lib/supabase");
        await Promise.all([
            sendBroadcast("refresh-orders", { orderId: order_id, status: paymentStatus }, "kitchen-updates"),
            sendBroadcast("refresh-orders", { orderId: order_id, status: paymentStatus }, `order-${order_id}`)
        ]);

        return apiResponse({ message: "OK" });
    } catch (error) {
        return handleApiError(error, "POST /api/webhooks/midtrans");
    }
}

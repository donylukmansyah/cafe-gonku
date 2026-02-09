import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        // 1. Find the order (either by CUID or OrderCode)
        const order = await prisma.order.findFirst({
            where: {
                OR: [
                    { id: id },
                    { orderCode: id }
                ]
            }
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (order.paymentStatus === "PAID") {
            if (supabaseAdmin) {
                const lib = await import("@/lib/supabase");
                await Promise.all([
                    lib.sendBroadcast("refresh-orders", { orderId: order.orderCode, status: "PAID" }, `order-${order.orderCode}`),
                    lib.sendBroadcast("refresh-orders", { orderId: order.orderCode, status: "PAID" }, "kitchen-updates")
                ]);
            }
            return NextResponse.json({ status: "PAID", message: "Already paid" });
        }

        // 2. Query Midtrans Status
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
                    orderStatus = "PENDING";
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

            // 3. Update Database if status changed
            if (paymentStatus !== order.paymentStatus) {
                const updatedOrder = await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        paymentStatus: paymentStatus as any,
                        status: (paymentStatus === "PAID" ? "PAID" : orderStatus) as any,
                        paidAt: paymentStatus === "PAID" ? new Date() : order.paidAt,
                        paymentMethod: payment_type || order.paymentMethod
                    }
                });

                // 4. Broadcast via Supabase (Server-side)
                if (supabaseAdmin) {
                    // Updated to use REST Broadcast for instant delivery (Parallel)
                    const lib = await import("@/lib/supabase");
                    await Promise.all([
                        lib.sendBroadcast("refresh-orders", { orderId: order.orderCode, status: paymentStatus }, `order-${order.orderCode}`),
                        lib.sendBroadcast("refresh-orders", { orderId: order.orderCode, status: paymentStatus }, "kitchen-updates")
                    ]);
                }

                return NextResponse.json({
                    status: paymentStatus,
                    updated: true,
                    message: `Status updated to ${paymentStatus}`
                });
            }

            return NextResponse.json({
                status: paymentStatus,
                updated: false,
                message: "Status same as database"
            });

        } catch (midtransError: any) {
            // If Midtrans returns 404, it might be that the transaction hasn't been created in their side yet
            // Handle both string and number status codes
            if (midtransError.httpStatusCode == 404 || midtransError.status_code == "404") {
                return NextResponse.json({
                    status: "PENDING",
                    updated: false,
                    message: "Transaction not found in Midtrans yet"
                });
            }
            console.error("[Midtrans Status Error]:", midtransError);
            throw midtransError;
        }

    } catch (error) {
        console.error("[POST /api/orders/[id]/check-payment] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

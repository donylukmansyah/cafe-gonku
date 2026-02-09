import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBroadcast } from "@/lib/supabase";

// POST /api/orders/[id]/cancel - Cancel a pending order
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params; // This is actually the orderCode based on how we use it, or ID? 
        // Let's assume the params is [id], which usually matches the folder name.
        // In this app, sometimes [id] is orderCode. Let's check existing usages.
        // Existing: /api/orders/[id]/status uses findUnique where: { id }. 
        // But TrackingSheet uses `orderCode`. 
        // Let's support both or look up by orderCode if id looks like one? 
        // Actually, for security, using the OrderCode (which is public on the receipt) to cancel might be risky if someone guesses it.
        // But without user accounts, possession of OrderCode is our "auth".

        // We will try to find by ID first, if not then OrderCode.
        // Or better, let's just stick to what the frontend sends.
        // The frontend `TrackingSheet` has `activeOrderCode`. 
        // The URL will be `/api/orders/[orderCode]/cancel`.

        const orderCode = id;

        // Verify Order Exists and is PENDING
        const existingOrder = await prisma.order.findFirst({
            where: {
                orderCode: orderCode, // We assume the ID param is the orderCode for customer facing ops
            },
            select: { id: true, status: true, paymentStatus: true, orderCode: true }
        });

        if (!existingOrder) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Only allow cancelling if PENDING payment and PENDING status
        if (existingOrder.status !== "PENDING" || existingOrder.paymentStatus !== "PENDING") {
            return NextResponse.json(
                { error: "Pesanan tidak dapat dibatalkan (Sudah dibayar atau diproses)." },
                { status: 400 }
            );
        }

        // Update status
        // We use a transaction or just simple update
        const updatedOrder = await prisma.order.update({
            where: { id: existingOrder.id }, // Use internal ID for update
            data: {
                status: "CANCELLED",
                paymentStatus: "FAILED" // Or EXPIRED? FAILED fits "cancelled by user" better than expired.
            }
        });

        // Broadcast Updates
        await Promise.all([
            sendBroadcast("refresh-orders", { orderId: existingOrder.orderCode, status: "CANCELLED" }, "kitchen-updates"),
            sendBroadcast("refresh-orders", { orderId: existingOrder.orderCode, status: "CANCELLED" }, `order-${existingOrder.orderCode}`)
        ]);

        return NextResponse.json({
            message: "Pesanan berhasil dibatalkan",
            order: updatedOrder
        });

    } catch (error) {
        console.error("[POST /api/orders/[id]/cancel] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

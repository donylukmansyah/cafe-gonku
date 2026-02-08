import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { updateOrderStatusSchema } from "@/validations/order";
import { supabase } from "@/lib/supabase";

// PATCH /api/orders/[id]/status - Update order status
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        // Authenticate user
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "KITCHEN" && userRole !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Validate request body
        const body = await request.json();
        const parseResult = updateOrderStatusSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: "Invalid request body", details: parseResult.error.flatten() },
                { status: 400 }
            );
        }

        const { status } = parseResult.data;

        // Check if order exists
        const existingOrder = await prisma.order.findUnique({
            where: { id },
            select: { id: true, status: true, orderCode: true },
        });

        if (!existingOrder) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Update order status
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

        // Create audit log
        await prisma.orderLog.create({
            data: {
                orderId: id,
                status,
                message: `Order status updated to ${status}`,
                createdBy: session.user.id,
            },
        });

        // Emit Supabase broadcast for real-time update
        await supabase.channel("kitchen-updates").send({
            type: "broadcast",
            event: "refresh-orders",
            payload: { orderId: id, status },
        });

        return NextResponse.json({
            message: "Order status updated successfully",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("[PATCH /api/orders/[id]/status] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { updateOrderStatusSchema } from "@/validations/order";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";

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
            return apiError("Unauthorized", 401);
        }

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "KITCHEN" && userRole !== "ADMIN") {
            return apiError("Forbidden", 403);
        }

        // Validate request body
        const body = await request.json();
        const parseResult = updateOrderStatusSchema.safeParse(body);

        if (!parseResult.success) {
            return apiError("Invalid request body", 400, parseResult.error.flatten());
        }

        const { status } = parseResult.data;

        // Check if order exists
        const existingOrder = await prisma.order.findUnique({
            where: { id },
            select: { id: true, status: true, orderCode: true },
        });

        if (!existingOrder) {
            return apiError("Order not found", 404);
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
        const payload = { orderId: existingOrder.orderCode, status };

        const { sendBroadcast } = await import("@/lib/supabase");
        await Promise.all([
            sendBroadcast("refresh-orders", payload, "kitchen-updates"),
            sendBroadcast("refresh-orders", payload, `order-${existingOrder.orderCode}`)
        ]);

        return apiResponse({
            message: "Order status updated successfully",
            order: updatedOrder,
        });
    } catch (error) {
        return handleApiError(error, "PATCH /api/orders/[id]/status");
    }
}

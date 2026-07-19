import { type NextRequest } from "next/server";
import { getServerSession } from "@/server/auth/server-auth";
import { updateOrderStatusSchema } from "@/features/orders/schema";
import { apiResponse, handleApiError, apiError } from "@/server/http/api-utils";
import { OrderService } from "@/features/orders/server/order.service";

// PATCH /api/orders/[id]/status - Update order status
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401);

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "KITCHEN" && userRole !== "OWNER") return apiError("Forbidden", 403);

        const body = await request.json();
        const parseResult = updateOrderStatusSchema.safeParse(body);

        if (!parseResult.success) {
            return apiError("Invalid request body", 400, parseResult.error.flatten());
        }

        const { status } = parseResult.data;

        const updatedOrder = await OrderService.updateOrderStatus(id, status, session.user.id);

        return apiResponse({
            message: "Order status updated successfully",
            order: updatedOrder,
        });
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("Invalid status transition")) {
            return apiError(error.message, 400);
        }
        return handleApiError(error, "PATCH /api/orders/[id]/status");
    }
}

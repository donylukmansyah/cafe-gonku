import { type NextRequest } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { updateOrderStatusSchema } from "@/validations/order";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { OrderService } from "@/lib/services/order.service";

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
        if (userRole !== "KITCHEN" && userRole !== "ADMIN") return apiError("Forbidden", 403);

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
        return handleApiError(error, "PATCH /api/orders/[id]/status");
    }
}

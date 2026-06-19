import { type NextRequest } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { bulkUpdateOrderStatusSchema } from "@/validations/order";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { OrderService } from "@/lib/services/order.service";

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401);

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "KITCHEN" && userRole !== "OWNER") return apiError("Forbidden", 403);

        const body = await request.json();
        const parseResult = bulkUpdateOrderStatusSchema.safeParse(body);

        if (!parseResult.success) {
            return apiError("Invalid request body", 400, parseResult.error.flatten());
        }

        const { orderIds, status } = parseResult.data;
        const updatedOrders = await OrderService.bulkUpdateOrderStatus(orderIds, status, session.user.id);

        return apiResponse({
            message: "Order statuses updated successfully",
            orders: updatedOrders,
        });
    } catch (error) {
        return handleApiError(error, "PATCH /api/orders/bulk-status");
    }
}

import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { OrderService } from "@/lib/services/order.service";

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        if (!id) {
            return apiError("Order ID or Code required", 400);
        }

        const order = await OrderService.getOrderByIdOrCode(id);

        if (!order) {
            return apiError("Order not found", 404);
        }

        return apiResponse(order);
    } catch (error) {
        return handleApiError(error, "GET /api/orders/[id]");
    }
}

import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { OrderService } from "@/lib/services/order.service";
import { getServerSession } from "@/lib/server-auth";
import { validateOrderAccess, OrderAccessError } from "@/lib/order-access";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        if (!id) {
            return apiError("Order ID or Code required", 400);
        }

        // 1. Rate limiting
        const rateLimit = await checkRateLimit("orderDetail", getClientIp(request));
        if (!rateLimit.success) {
            return apiError("Terlalu banyak request. Coba lagi sebentar.", 429);
        }

        // 2. Authentication check
        // Check if user is staff (OWNER or KITCHEN)
        const session = await getServerSession();
        let isStaff = false;
        if (session) {
            const userRole = (session.user as { role?: string }).role;
            if (userRole === "KITCHEN" || userRole === "OWNER") {
                isStaff = true;
            }
        }

        // If not staff, validate ownership via order access token
        if (!isStaff) {
            try {
                await validateOrderAccess(request, id);
            } catch (err) {
                if (err instanceof OrderAccessError) {
                    return apiError(err.message, err.status);
                }
                return apiError("Unauthorized", 401);
            }
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

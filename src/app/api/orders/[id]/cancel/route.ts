import { apiResponse, handleApiError, apiError } from "@/server/http/api-utils";
import { OrderService } from "@/features/orders/server/order.service";
import { checkRateLimit, getClientIp } from "@/server/rate-limit/rate-limit";
import { validateOrderAccess, OrderAccessError } from "@/features/orders/server/order-access";

// POST /api/orders/[id]/cancel - Cancel a pending order
export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;
        const rateLimit = await checkRateLimit(
            "orderCancel",
            `${getClientIp(request)}:${id}`,
        );
        if (!rateLimit.success) {
            return apiError("Terlalu banyak request pembatalan. Coba lagi sebentar.", 429);
        }

        // Validate customer ownership of the order
        try {
            await validateOrderAccess(request, id);
        } catch (err) {
            if (err instanceof OrderAccessError) {
                return apiError(err.message, err.status);
            }
            return apiError("Unauthorized", 401);
        }

        const updatedOrder = await OrderService.cancelOrder(id);

        return apiResponse({
            message: "Pesanan berhasil dibatalkan",
            order: updatedOrder
        });

    } catch (error) {
        return handleApiError(error, `POST /api/orders/[id]/cancel`);
    }
}

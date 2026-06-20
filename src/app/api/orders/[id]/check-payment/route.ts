import { apiError, apiResponse, handleApiError } from "@/lib/api-utils";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { OrderService } from "@/lib/services/order.service";
import { validateOrderAccess, OrderAccessError } from "@/lib/order-access";
import { createApiTimer } from "@/lib/api-timing";
import { logger } from "@/lib/logger";

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const timer = createApiTimer("POST /api/orders/[id]/check-payment");

    try {
        const { id } = await props.params;
        const rateLimit = await timer.step("rateLimit", () =>
            checkRateLimit(
                "paymentCheck",
                `${getClientIp(request)}:${id}`,
            ),
        );
        if (!rateLimit.success) {
            timer.finish(429);
            return apiError("Terlalu banyak cek pembayaran. Coba lagi sebentar.", 429);
        }

        try {
            await timer.step("orderAccess", () => validateOrderAccess(request, id));
        } catch (err) {
            if (err instanceof OrderAccessError) {
                timer.finish(err.status);
                return apiError(err.message, err.status);
            }
            timer.finish(401);
            return apiError("Unauthorized", 401);
        }

        logger.debug(`[Payment Pipeline] ${new Date().toISOString()} - check-payment API called for id: ${id}`);

        const result = await timer.step("paymentStatus", () => OrderService.checkPaymentStatus(id));

        timer.finish(200, { updated: Boolean(result.updated), status: result.status });
        return apiResponse(result);

    } catch (error) {
        timer.finish(500);
        return handleApiError(error, "POST /api/orders/[id]/check-payment");
    }
}

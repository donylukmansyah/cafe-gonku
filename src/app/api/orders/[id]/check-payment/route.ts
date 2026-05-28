import { apiError, apiResponse, handleApiError } from "@/lib/api-utils";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { OrderService } from "@/lib/services/order.service";

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;
        const rateLimit = await checkRateLimit(
            "paymentCheck",
            `${getClientIp(request)}:${id}`,
        );
        if (!rateLimit.success) {
            return apiError("Terlalu banyak cek pembayaran. Coba lagi sebentar.", 429);
        }

        console.log(`[Payment Pipeline] ${new Date().toISOString()} - check-payment API called for id: ${id}`);

        const result = await OrderService.checkPaymentStatus(id);

        return apiResponse(result);

    } catch (error) {
        return handleApiError(error, "POST /api/orders/[id]/check-payment");
    }
}

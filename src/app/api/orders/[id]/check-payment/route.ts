import { apiResponse, handleApiError } from "@/lib/api-utils";
import { OrderService } from "@/lib/services/order.service";

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;
        console.log(`[Payment Pipeline] ${new Date().toISOString()} - check-payment API called for id: ${id}`);

        const result = await OrderService.checkPaymentStatus(id);

        return apiResponse(result);

    } catch (error) {
        return handleApiError(error, "POST /api/orders/[id]/check-payment");
    }
}

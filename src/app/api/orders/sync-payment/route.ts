import { apiResponse, handleApiError } from "@/lib/api-utils";
import { OrderService } from "@/lib/services/order.service";

// POST /api/orders/sync-payment
// Bulk check for all PENDING orders to update their status from Midtrans
export async function POST() {
    try {
        const result = await OrderService.syncPendingPayments();

        return apiResponse({
            message: result.updatedCount > 0 ? "Sync completed with updates" : "Sync completed. No updates required.",
            ...result
        });

    } catch (error) {
        return handleApiError(error, "POST /api/orders/sync-payment");
    }
}

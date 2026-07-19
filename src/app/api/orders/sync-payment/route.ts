import { getServerSession } from "@/server/auth/server-auth";
import { apiError, apiResponse, handleApiError } from "@/server/http/api-utils";
import { checkRateLimit, getClientIp } from "@/server/rate-limit/rate-limit";
import { OrderService } from "@/features/orders/server/order.service";

// POST /api/orders/sync-payment
// Bulk check for all PENDING orders to update their status from payment gateway
export async function POST(request: Request) {
    try {
        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401);

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "KITCHEN" && userRole !== "OWNER") {
            return apiError("Forbidden", 403);
        }

        const rateLimit = await checkRateLimit("paymentSync", getClientIp(request));
        if (!rateLimit.success) {
            return apiError("Terlalu banyak sync pembayaran. Coba lagi sebentar.", 429);
        }

        const result = await OrderService.syncPendingPayments();

        return apiResponse({
            message: result.updatedCount > 0 ? "Sync completed with updates" : "Sync completed. No updates required.",
            ...result
        });

    } catch (error) {
        return handleApiError(error, "POST /api/orders/sync-payment");
    }
}

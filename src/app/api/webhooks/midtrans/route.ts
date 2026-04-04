import crypto from "crypto";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { OrderService } from "@/lib/services/order.service";

// POST /api/webhooks/midtrans
export async function GET() {
    return apiResponse({ message: "Webhook endpoint is alive" });
}

export async function POST(request: Request) {
    try {
        console.log(`[Payment Pipeline] ${new Date().toISOString()} - Webhook received HTTP request`);
        const body = await request.json();

        // 1. Extract Variables
        const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;

        // 2. Verify Signature Key
        const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
        const input = order_id + status_code + gross_amount + serverKey;
        const signature = crypto.createHash("sha512").update(input).digest("hex");

        if (signature !== signature_key) {
            // Fallback: Try with .00 removed
            const amountInt = gross_amount.toString().split('.')[0];
            const input2 = order_id + status_code + amountInt + serverKey;
            const signature2 = crypto.createHash("sha512").update(input2).digest("hex");

            if (signature2 !== signature_key) {
                return apiError("Invalid signature", 403);
            }
        }

        console.log(`[Webhook] Order: ${order_id} | Status: ${transaction_status}`);

        console.log(`[Payment Pipeline] ${new Date().toISOString()} - Webhook starting DB update for ${order_id}`);
        // 4. Update Database (Idempotent update)
        await OrderService.handleMidtransNotification(body);

        return apiResponse({ message: "OK" });
    } catch (error) {
        return handleApiError(error, "POST /api/webhooks/midtrans");
    }
}

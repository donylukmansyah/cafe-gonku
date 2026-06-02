import crypto from "crypto";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { OrderService } from "@/lib/services/order.service";

/**
 * Shared logic to process Midtrans webhook notifications.
 * Verifies signature key and updates database status idempotently.
 */
export async function processMidtransNotification(request: Request, endpoint: string) {
    try {
        console.log(`[Payment Pipeline] ${new Date().toISOString()} - Webhook received HTTP request (via ${endpoint})`);
        const body = await request.json();

        const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;

        if (
            typeof order_id !== "string" ||
            typeof status_code !== "string" ||
            (typeof gross_amount !== "string" && typeof gross_amount !== "number") ||
            typeof signature_key !== "string" ||
            typeof transaction_status !== "string"
        ) {
            return apiError("Invalid notification payload", 400);
        }

        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        if (!serverKey) {
            return apiError("Payment gateway is not configured", 500);
        }

        const grossAmount = String(gross_amount);
        const input = order_id + status_code + grossAmount + serverKey;
        const signature = crypto.createHash("sha512").update(input).digest("hex");
        const amountInt = grossAmount.split(".")[0];
        const inputWithoutDecimal = order_id + status_code + amountInt + serverKey;
        const signatureWithoutDecimal = crypto.createHash("sha512").update(inputWithoutDecimal).digest("hex");

        const receivedSignature = Buffer.from(signature_key);
        const signatureMatches =
            receivedSignature.length === 128 &&
            (crypto.timingSafeEqual(Buffer.from(signature), receivedSignature) ||
                crypto.timingSafeEqual(Buffer.from(signatureWithoutDecimal), receivedSignature));

        if (!signatureMatches) {
            return apiError("Invalid signature", 403);
        }

        console.log(`[Webhook] Order: ${order_id} | Status: ${transaction_status}`);

        console.log(`[Payment Pipeline] ${new Date().toISOString()} - Webhook starting DB update for ${order_id}`);
        
        // 3. Update Database (Idempotent update)
        await OrderService.handleMidtransNotification(body);

        return apiResponse({ message: "OK" });
    } catch (error) {
        return handleApiError(error, `POST ${endpoint}`);
    }
}

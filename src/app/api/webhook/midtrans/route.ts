import { apiResponse } from "@/lib/api-utils";
import { processMidtransNotification } from "@/lib/midtrans-webhook-handler";

// POST /api/webhook/midtrans — alias for /api/webhooks/midtrans
export async function GET() {
    return apiResponse({ message: "Webhook endpoint is alive" });
}

export async function POST(request: Request) {
    return processMidtransNotification(request, "/api/webhook/midtrans");
}

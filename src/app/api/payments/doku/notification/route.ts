import * as Sentry from "@sentry/nextjs";
import { apiError, apiResponse, handleApiError } from "@/lib/api-utils";
import { isDokuTimestampFresh, verifyDokuSignature } from "@/lib/doku";
import { guardPaymentBusinessEvent, guardPaymentNotificationReplay } from "@/lib/payment-notification";
import { OrderService } from "@/lib/services/order.service";

const REQUEST_TARGET = "/api/payments/doku/notification";

export async function GET() {
  return apiResponse({ message: "DOKU notification endpoint is alive" });
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const clientId = request.headers.get("Client-Id") ?? "";
    const requestId = request.headers.get("Request-Id") ?? "";
    const requestTimestamp = request.headers.get("Request-Timestamp") ?? "";
    const signature = request.headers.get("Signature") ?? "";

    const isValid = verifyDokuSignature({
      clientId,
      requestId,
      requestTimestamp,
      requestTarget: REQUEST_TARGET,
      body,
      signature,
    });

    if (!isValid) {
      return apiError("Invalid signature", 401);
    }

    if (!isDokuTimestampFresh(requestTimestamp)) {
      Sentry.captureMessage("Stale DOKU notification rejected", {
        level: "warning",
        tags: { area: "payment", gateway: "doku" },
        extra: { requestId, requestTimestamp },
      });
      return apiError("Stale notification", 401);
    }

    const replayGuard = await guardPaymentNotificationReplay({
      gateway: "doku",
      clientId,
      requestId,
    });

    if (!replayGuard.ok) {
      return apiError(replayGuard.message, replayGuard.status);
    }

    if (replayGuard.duplicate) {
      return apiResponse({ message: replayGuard.message, duplicate: true });
    }

    const payload = JSON.parse(body);
    const invoiceNumber = payload.order?.invoice_number ?? payload.invoice_number;
    const dokuStatus = payload.transaction?.status ?? payload.transaction_status ?? "PENDING";
    const amount = payload.order?.amount;
    const transactionId = payload.transaction?.original_request_id ?? requestId;

    const businessEventGuard = await guardPaymentBusinessEvent({
      gateway: "doku",
      orderCode: invoiceNumber,
      status: dokuStatus,
      amount,
      transactionId,
    });

    if (!businessEventGuard.ok) {
      return apiError(businessEventGuard.message, businessEventGuard.status);
    }

    if (businessEventGuard.duplicate) {
      return apiResponse({ message: businessEventGuard.message, duplicate: true });
    }

    const result = await OrderService.handleDokuNotification(payload);

    return apiResponse(result);
  } catch (error) {
    return handleApiError(error, "POST /api/payments/doku/notification");
  }
}

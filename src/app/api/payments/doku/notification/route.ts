import * as Sentry from "@sentry/nextjs";
import { apiError, apiResponse, handleApiError } from "@/server/http/api-utils";
import { isDokuTimestampFresh, verifyDokuSignature } from "@/server/payment/doku";
import { guardPaymentBusinessEvent, guardPaymentNotificationReplay } from "@/features/orders/server/payment/payment-notification";
import { OrderService } from "@/features/orders/server/order.service";

const REQUEST_TARGET = "/api/payments/doku/notification";

export async function GET() {
  return apiResponse({ message: "DOKU notification endpoint is alive" });
}

// Endpoint webhook DOKU; dipanggil DOKU setelah customer bayar.
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const clientId = request.headers.get("Client-Id") ?? "";
    const requestId = request.headers.get("Request-Id") ?? "";
    const requestTimestamp = request.headers.get("Request-Timestamp") ?? "";
    const signature = request.headers.get("Signature") ?? "";

    // Pastikan notification benar dari DOKU sebelum update order.
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

    // Cegah notification yang sama diproses dua kali.
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

    // Jika valid, lanjut update paymentStatus, paidAt, dan priorityScore.
    const result = await OrderService.handleDokuNotification(payload);

    return apiResponse(result);
  } catch (error) {
    return handleApiError(error, "POST /api/payments/doku/notification");
  }
}

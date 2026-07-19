import * as Sentry from "@sentry/nextjs";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { AppError } from "@/server/http/api-utils";
import { parseCafeLocalDateTime } from "@/shared/cafe-date";

export const PAYMENT_EXPIRY_MINUTES = 60;

export type GatewayStatusPayload = {
  order_id?: string;
  transaction_status?: string;
  fraud_status?: string | null;
  payment_type?: string | null;
  settlement_time?: string | null;
  transaction_time?: string | null;
  payment_amounts?: Array<{ paid_at?: string | null }> | null;
  gross_amount?: string | number | null;
  order?: { amount?: string | number | null };
};

export type GatewayUpdateSource = "webhook" | "check-payment" | "sync-payment" | "local-expire";

export type GatewayUpdateContext = {
  source: GatewayUpdateSource;
  gateway: "doku" | "local";
};

export function normalizeGatewayAmount(amount: string | number | undefined | null) {
  if (amount === undefined || amount === null) return null;

  const parsed = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function assertGatewayAmountMatches(
  gatewayAmount: string | number | undefined | null,
  orderAmount: number,
  options: { requireAmount?: boolean; orderCode?: string } = {},
) {
  const normalizedAmount = normalizeGatewayAmount(gatewayAmount);

  if (normalizedAmount === null) {
    if (options.requireAmount) {
      const error = new AppError("Payment amount is required for paid gateway update", 400);
      Sentry.captureException(error, {
        tags: { area: "payment", orderCode: options.orderCode ?? "unknown" },
      });
      throw error;
    }

    return;
  }

  if (normalizedAmount !== orderAmount) {
    const error = new AppError("Payment amount mismatch", 400);
    Sentry.captureException(error, {
      tags: { area: "payment", orderCode: options.orderCode ?? "unknown" },
      extra: { gatewayAmount: normalizedAmount, orderAmount },
    });
    throw error;
  }
}

export function mapGatewayStatusToOrderState(payload: GatewayStatusPayload) {
  switch (payload.transaction_status) {
    case "capture":
      if (payload.fraud_status === "challenge") {
        return {
          paymentStatus: PaymentStatus.PENDING,
          orderStatus: OrderStatus.PENDING,
        };
      }

      return {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.PAID,
      };

    case "settlement":
    case "SUCCESS":
      return {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.PAID,
      };

    case "deny":
    case "cancel":
    case "FAILED":
      return {
        paymentStatus: PaymentStatus.FAILED,
        orderStatus: OrderStatus.CANCELLED,
      };

    case "expire":
    case "EXPIRED":
      return {
        paymentStatus: PaymentStatus.EXPIRED,
        orderStatus: OrderStatus.CANCELLED,
      };

    case "pending":
    case "PENDING":
    case "TIMEOUT":
    case "REDIRECT":
    default:
      return {
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.PENDING,
      };
  }
}

export function resolveGatewayPaidAt(payload: GatewayStatusPayload) {
  return (
    parseCafeLocalDateTime(payload.payment_amounts?.[0]?.paid_at ?? null) ??
    parseCafeLocalDateTime(payload.settlement_time ?? null) ??
    parseCafeLocalDateTime(payload.transaction_time ?? null) ??
    null
  );
}

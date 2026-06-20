import * as Sentry from "@sentry/nextjs";
import { cacheSetNx } from "@/lib/redis";

export type PaymentGateway = "doku";

export type PaymentNotificationGuardResult =
  | { ok: true; duplicate: false }
  | { ok: true; duplicate: true; message: string }
  | { ok: false; status: number; message: string };

export function getPaymentNotificationReplayKey({
  gateway,
  clientId,
  requestId,
}: {
  gateway: PaymentGateway;
  clientId?: string;
  requestId: string;
}) {
  return `payment:notification:${gateway}:${clientId ?? "default"}:${requestId}`;
}

export function getPaymentBusinessEventKey({
  gateway,
  orderCode,
  status,
  amount,
  transactionId,
}: {
  gateway: PaymentGateway;
  orderCode: string;
  status: string;
  amount?: string | number | null;
  transactionId?: string | null;
}) {
  return [
    "payment",
    "event",
    gateway,
    orderCode,
    transactionId || "no-transaction-id",
    status || "unknown-status",
    amount ?? "no-amount",
  ].join(":");
}

export async function guardPaymentNotificationReplay({
  gateway,
  clientId,
  requestId,
  ttlSeconds = 24 * 60 * 60,
}: {
  gateway: PaymentGateway;
  clientId?: string;
  requestId: string;
  ttlSeconds?: number;
}): Promise<PaymentNotificationGuardResult> {
  if (!requestId) {
    return { ok: false, status: 400, message: "Missing request id" };
  }

  const replayKey = getPaymentNotificationReplayKey({ gateway, clientId, requestId });
  const isFirstDelivery = await cacheSetNx(replayKey, "1", ttlSeconds);

  if (!isFirstDelivery) {
    Sentry.captureMessage("Duplicate payment notification ignored", {
      level: "info",
      tags: { area: "payment", gateway },
      extra: { requestId, clientId },
    });

    return {
      ok: true,
      duplicate: true,
      message: "Duplicate notification ignored",
    };
  }

  return { ok: true, duplicate: false };
}

export async function guardPaymentBusinessEvent({
  gateway,
  orderCode,
  status,
  amount,
  transactionId,
  ttlSeconds = 24 * 60 * 60,
}: {
  gateway: PaymentGateway;
  orderCode: string;
  status: string;
  amount?: string | number | null;
  transactionId?: string | null;
  ttlSeconds?: number;
}): Promise<PaymentNotificationGuardResult> {
  if (!orderCode) {
    return { ok: false, status: 400, message: "Missing order code" };
  }

  const eventKey = getPaymentBusinessEventKey({
    gateway,
    orderCode,
    status,
    amount,
    transactionId,
  });
  const isFirstDelivery = await cacheSetNx(eventKey, "1", ttlSeconds);

  if (!isFirstDelivery) {
    Sentry.captureMessage("Duplicate payment business event ignored", {
      level: "info",
      tags: { area: "payment", gateway },
      extra: { orderCode, status, amount, transactionId },
    });

    return {
      ok: true,
      duplicate: true,
      message: "Duplicate payment event ignored",
    };
  }

  return { ok: true, duplicate: false };
}

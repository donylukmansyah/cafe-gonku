import * as Sentry from "@sentry/nextjs";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { OWNER_DASHBOARD_CACHE_TAG } from "@/shared/cache-tags";
import { bumpCacheVersion } from "@/server/cache/redis";
import { REALTIME_CHANNELS } from "@/shared/realtime-channels";
import { supabaseAdmin, sendBroadcast } from "@/server/realtime/supabase";

export async function broadcastOrderStatus({
  orderCode,
  eventType,
  orderStatus,
  paymentStatus,
  fullOrder,
}: {
  orderCode: string;
  eventType: "payment.updated" | "order.status.updated";
  orderStatus: OrderStatus;
  paymentStatus?: PaymentStatus;
  fullOrder?: unknown;
}) {
  if (!supabaseAdmin) {
    return;
  }

  const payload = {
    eventType,
    orderCode,
    orderId: orderCode,
    orderStatus,
    paymentStatus,
    status: orderStatus,
    ...(fullOrder ? { fullOrder } : {}),
  };

  try {
    await Promise.all([
      sendBroadcast("refresh-orders", payload, REALTIME_CHANNELS.kitchenUpdates),
      sendBroadcast("refresh-orders", payload, REALTIME_CHANNELS.order(orderCode)),
    ]);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { area: "realtime", eventType },
      extra: { orderCode, orderStatus, paymentStatus },
    });

    console.error("[Realtime] Failed to broadcast order status", {
      orderCode,
      eventType,
      orderStatus,
      paymentStatus,
      error,
    });
  }
}

export function revalidateOwnerDashboard() {
  revalidateTag(OWNER_DASHBOARD_CACHE_TAG, "max");
  void bumpCacheVersion("analytics");
}

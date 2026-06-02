import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

type RateLimitName = "orderCreate" | "priceVerify" | "paymentCheck" | "paymentSync" | "orderCancel" | "orderDetail";

const limiters = redis
  ? {
      orderCreate: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(6, "1 m"),
        analytics: true,
        prefix: "ratelimit:order-create",
      }),
      priceVerify: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(12, "1 m"),
        analytics: true,
        prefix: "ratelimit:price-verify",
      }),
      paymentCheck: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        analytics: true,
        prefix: "ratelimit:payment-check",
      }),
      paymentSync: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:payment-sync",
      }),
      orderCancel: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:order-cancel",
      }),
      orderDetail: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        analytics: true,
        prefix: "ratelimit:order-detail",
      }),
    }
  : null;

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

export async function checkRateLimit(
  name: RateLimitName,
  identifier: string,
) {
  const limiter = limiters?.[name];
  if (!limiter) {
    return { success: true, remaining: null, reset: null };
  }

  try {
    return await limiter.limit(identifier);
  } catch (error) {
    console.error("[RateLimit] check failed", { name, identifier, error });
    return { success: true, remaining: null, reset: null };
  }
}

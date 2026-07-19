import * as Sentry from "@sentry/nextjs";

type ApiTimingFields = Record<string, string | number | boolean | null | undefined>;

type ApiTimer = {
  step: <T>(name: string, work: () => Promise<T>) => Promise<T>;
  finish: (status?: number, fields?: ApiTimingFields) => void;
};

const SLOW_API_MS = Number(process.env.API_TIMING_SLOW_MS ?? 500);
const LOG_API_TIMING = process.env.NODE_ENV !== "production" || process.env.API_TIMING_LOGS === "true";

function nowMs() {
  return performance.now();
}

function roundMs(value: number) {
  return Math.round(value * 10) / 10;
}

function logTiming(payload: ApiTimingFields) {
  if (!LOG_API_TIMING) return;
  console.log(JSON.stringify({ type: "api_timing", ...payload }));
}

export function createApiTimer(route: string): ApiTimer {
  const startedAt = nowMs();
  const steps: Record<string, number> = {};

  return {
    async step(name, work) {
      const stepStartedAt = nowMs();

      return Sentry.startSpan(
        {
          name: `${route}:${name}`,
          op: "api.step",
        },
        async () => {
          try {
            return await work();
          } finally {
            steps[name] = roundMs(nowMs() - stepStartedAt);
          }
        },
      );
    },
    finish(status = 200, fields = {}) {
      const durationMs = roundMs(nowMs() - startedAt);
      const payload = {
        route,
        status,
        durationMs,
        slow: durationMs >= SLOW_API_MS,
        ...fields,
        ...Object.fromEntries(
          Object.entries(steps).map(([name, value]) => [`${name}Ms`, value]),
        ),
      };

      logTiming(payload);
      Sentry.addBreadcrumb({
        category: "api.timing",
        level: durationMs >= SLOW_API_MS ? "warning" : "info",
        message: route,
        data: payload,
      });
    },
  };
}

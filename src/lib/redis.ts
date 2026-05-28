import { Redis } from "@upstash/redis";

const CACHE_PREFIX = process.env.REDIS_CACHE_PREFIX || "cafe-gonku";
const CACHE_METRICS_ENABLED = process.env.REDIS_CACHE_METRICS !== "false";
const CACHE_METRICS_TTL_SECONDS = 60 * 60 * 24 * 7;
const TTL_JITTER_RATIO = 0.1;

const hasRedisCredentials = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

export const redis = hasRedisCredentials ? Redis.fromEnv() : null;

type CacheMetric = "hit" | "miss" | "set" | "error" | "invalidate";

type CacheRememberOptions<T> = {
  scope: string;
  key: string;
  ttlSeconds: number;
  enabled?: boolean;
  cacheNull?: boolean;
  load: () => Promise<T>;
};

function namespacedKey(key: string) {
  return `${CACHE_PREFIX}:${key}`;
}

function withTtlJitter(ttlSeconds: number) {
  if (ttlSeconds <= 0) return ttlSeconds;

  const jitter = Math.floor(ttlSeconds * TTL_JITTER_RATIO);
  if (jitter <= 0) return ttlSeconds;

  return ttlSeconds - jitter + Math.floor(Math.random() * (jitter * 2 + 1));
}

async function recordCacheMetric(scope: string, metric: CacheMetric) {
  if (!redis || !CACHE_METRICS_ENABLED) return;

  const key = namespacedKey(`cache:metrics:${scope}:${metric}`);

  try {
    await redis.incr(key);
    await redis.expire(key, CACHE_METRICS_TTL_SECONDS);
  } catch {
    // Metrics must never affect request handling.
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  const redisKey = namespacedKey(key);

  try {
    return await redis.get<T>(redisKey);
  } catch (error) {
    console.error("[Redis] cache get failed", { key, error });
    const scope = key.split(":")[1] ?? "unknown";
    await recordCacheMetric(scope, "error");
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
) {
  if (!redis) return;
  const redisKey = namespacedKey(key);

  try {
    await redis.set(redisKey, value, { ex: withTtlJitter(ttlSeconds) });
    const scope = key.split(":")[1] ?? "unknown";
    await recordCacheMetric(scope, "set");
  } catch (error) {
    console.error("[Redis] cache set failed", { key, error });
    const scope = key.split(":")[1] ?? "unknown";
    await recordCacheMetric(scope, "error");
  }
}

export async function getCacheVersion(scope: string) {
  if (!redis) return 1;
  const key = namespacedKey(`cache:version:${scope}`);

  try {
    return (await redis.get<number>(key)) ?? 1;
  } catch (error) {
    console.error("[Redis] cache version get failed", { scope, error });
    await recordCacheMetric(scope, "error");
    return 1;
  }
}

export async function bumpCacheVersion(scope: string) {
  if (!redis) return;
  const key = namespacedKey(`cache:version:${scope}`);

  try {
    await redis.incr(key);
    await recordCacheMetric(scope, "invalidate");
  } catch (error) {
    console.error("[Redis] cache version bump failed", { scope, error });
    await recordCacheMetric(scope, "error");
  }
}

export async function versionedCacheKey(scope: string, key: string) {
  const version = await getCacheVersion(scope);
  return `cache:${scope}:v${version}:${key}`;
}

export async function cacheRemember<T>({
  scope,
  key,
  ttlSeconds,
  enabled = true,
  cacheNull = false,
  load,
}: CacheRememberOptions<T>): Promise<T> {
  if (!enabled || !redis) {
    return load();
  }

  const cacheKey = await versionedCacheKey(scope, key);
  const cachedValue = await cacheGet<T>(cacheKey);

  if (cachedValue !== null) {
    await recordCacheMetric(scope, "hit");
    return cachedValue;
  }

  await recordCacheMetric(scope, "miss");

  const freshValue = await load();
  if (freshValue !== null || cacheNull) {
    await cacheSet(cacheKey, freshValue, ttlSeconds);
  }

  return freshValue;
}

export async function getCacheStats(scopes: string[]) {
  if (!redis) {
    return scopes.map((scope) => ({
      scope,
      enabled: false,
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0,
      invalidations: 0,
      hitRate: 0,
    }));
  }

  return Promise.all(
    scopes.map(async (scope) => {
      const [hits, misses, sets, errors, invalidations] = await Promise.all([
        redis.get<number>(namespacedKey(`cache:metrics:${scope}:hit`)),
        redis.get<number>(namespacedKey(`cache:metrics:${scope}:miss`)),
        redis.get<number>(namespacedKey(`cache:metrics:${scope}:set`)),
        redis.get<number>(namespacedKey(`cache:metrics:${scope}:error`)),
        redis.get<number>(namespacedKey(`cache:metrics:${scope}:invalidate`)),
      ]);

      const hitCount = hits ?? 0;
      const missCount = misses ?? 0;
      const totalReads = hitCount + missCount;

      return {
        scope,
        enabled: true,
        hits: hitCount,
        misses: missCount,
        sets: sets ?? 0,
        errors: errors ?? 0,
        invalidations: invalidations ?? 0,
        hitRate: totalReads ? Number((hitCount / totalReads).toFixed(4)) : 0,
      };
    }),
  );
}

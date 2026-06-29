# Vendor portability and migration playbook

Purpose: keep Cafe Gonku practical today, but easy to migrate later if a managed service becomes expensive, slow, or hits limits.

Principle:

```txt
Use managed services until there is real pain.
Keep vendor SDKs behind small infrastructure modules.
Migrate one service at a time, based on measured need.
```

This project should stay a boring monolith. Do not introduce microservices, Kubernetes, queues, or provider abstractions unless there is a real operational reason.

## Current vendor map

| Area | Current provider/library | Current boundary | Lock-in risk | Notes |
|---|---|---|---|---|
| Database | Supabase Postgres + Prisma | `src/lib/prisma.ts`, Prisma schema | Low | Supabase DB is standard Postgres. Migration path is `pg_dump`/`pg_restore` plus env changes. |
| Payment | DOKU Checkout | `src/lib/doku.ts`, `/api/payments/doku/notification` | Medium, expected | Payment gateways are inherently vendor-specific. Domain fields are already generic. |
| Realtime | Supabase Realtime broadcast | `src/lib/supabase.ts`, `useRealtimeOrder`, `useKitchenOrders`, `use-realtime-menu-updates` | Medium | App has polling/refetch fallback, so realtime is convenience, not source of truth. |
| Cache | Upstash Redis REST | `src/lib/redis.ts` | Medium | Cache helpers isolate most calls. Rate limiting still uses `@upstash/ratelimit` in `src/lib/rate-limit.ts`. |
| Rate limit | Upstash Ratelimit | `src/lib/rate-limit.ts` | Medium | Easy to replace with Redis TCP/custom limiter later if needed. |
| Image storage | Supabase Storage currently; Patrins delete/download support present | `src/lib/image-storage.ts`, `src/app/api/upload/route.ts` | Medium | Upload path goes through one module. Good migration candidate to S3-compatible storage later. |
| Image proxy/URL | Supabase/Patrins URL helpers | `src/lib/image-url.ts`, `/api/images/patrins/[id]` | Low-Medium | Keep image URLs stable or store provider/path metadata before moving. |
| Monitoring | Sentry | Sentry config files + `src/lib/api-timing.ts` | Low | Optional. App should run without custom monitoring features. |

## Current portability assessment

Status: good enough for production MVP.

Good signs:

```txt
- Database is Postgres, not proprietary NoSQL.
- Prisma schema is the source of truth for app data shape.
- Payment DB fields are generic: paymentRedirectUrl, paymentGatewayOrderId.
- Image upload goes through uploadMenuImage().
- Cache access mostly goes through cacheGet/cacheSet/cacheRemember/bumpCacheVersion.
- Rate limit goes through checkRateLimit().
- Payment webhook verifies signature server-side.
- Realtime has polling/refetch fallback.
```

Known coupling:

```txt
- Supabase client is used directly by realtime hooks.
- Supabase broadcast helper is tied to Supabase REST Realtime API.
- Upstash Redis REST client is used directly inside src/lib/redis.ts.
- Upstash Ratelimit is used directly inside src/lib/rate-limit.ts.
- Supabase Storage is currently the upload implementation in src/lib/image-storage.ts.
- DOKU frontend script is used by useDokuCheckout().
```

This coupling is acceptable now because it is concentrated in infrastructure files. Do not refactor everything until limits/cost/latency justify it.

## Rules for future AI/code changes

When adding features:

1. Do not import vendor SDKs directly in feature services, UI components, or route handlers unless the file is clearly an infrastructure boundary.
2. Keep vendor SDK imports inside `src/lib/*` or a provider-specific adapter file.
3. Use generic domain names in Prisma models and TypeScript types.
4. Do not create fields like `supabaseFileId`, `upstashKey`, or `dokuToken` unless there is a strong reason. Prefer `imageProvider`, `imagePath`, `paymentGatewayOrderId`, `paymentRedirectUrl`.
5. Do not remove polling/refetch fallbacks when improving realtime.
6. Do not migrate providers without measured reason and backup.
7. Migrate one provider at a time.
8. Do not run destructive Prisma commands against production data.

Preferred dependency direction:

```txt
UI / hooks / route handlers
  -> feature services
  -> src/lib wrappers
  -> vendor SDK/API
```

Avoid:

```txt
UI / feature services -> vendor SDK directly
```

## Migration triggers

Do not migrate because of fear. Migrate only when one of these is true.

### Database migration triggers

Migrate Supabase Postgres to VPS Postgres/managed Postgres if:

```txt
- connection limits are frequently hit
- query latency remains high after indexing/query fixes
- cost becomes unacceptable
- backups/restore/control requirements exceed Supabase plan
- production requires direct DB control
```

Do not migrate if:

```txt
- traffic is still small
- query slowness is caused by missing indexes or inefficient queries
- free/cheap tier is still stable
```

### Redis/cache migration triggers

Migrate Upstash Redis to local Redis/managed Redis if:

```txt
- Upstash request limits are hit
- Redis REST latency hurts user experience
- rate limit checks become too expensive
- cache usage grows beyond current plan
```

Do not migrate if:

```txt
- Redis is only used for small cache/rate-limit workloads
- app still works acceptably without cache
```

### Storage migration triggers

Migrate Supabase Storage/Patrins to R2/S3/MinIO if:

```txt
- storage quota or bandwidth limit is hit
- image delivery gets slow
- provider cost becomes high
- horizontal scaling requires shared object storage
```

Best future target:

```txt
S3-compatible storage
```

Examples:

```txt
Cloudflare R2
MinIO on VPS
AWS S3
Wasabi/Backblaze S3-compatible storage
```

### Realtime migration triggers

Migrate Supabase Realtime to custom SSE/WebSocket/Redis pub-sub if:

```txt
- realtime delay frequently exceeds 10-15 seconds
- connection/channel limits are hit
- cost becomes high
- horizontal app instances need provider-neutral realtime
```

Do not migrate if:

```txt
- payment/order updates arrive within 1-5 seconds
- polling fallback is acceptable
```

### Payment migration triggers

Migrate DOKU only if:

```txt
- merchant requirements change
- fees/support/payment methods are unacceptable
- reliability is poor
- cafe requests another payment provider
```

Payment providers are naturally vendor-specific. Keep app fields and internal service names generic.

## Service-by-service exit plans

### 1. Supabase Postgres -> VPS Postgres

Preconditions:

```txt
- recent backup exists
- maintenance window agreed
- app can be temporarily stopped or put into read-only/manual mode
- target Postgres version chosen
- target database has enough disk/RAM
```

High-level steps:

1. Stop writes or schedule downtime.
2. Export source DB:

```sh
pg_dump "$SUPABASE_DATABASE_URL" --format=custom --file=cafe-gonku.dump
```

3. Restore to target DB:

```sh
pg_restore --dbname="$TARGET_DATABASE_URL" --clean --if-exists cafe-gonku.dump
```

4. Update env:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

5. Run:

```sh
pnpm prisma:generate
npx tsc --noEmit
pnpm build
```

6. Smoke test:

```txt
login owner
login kitchen
create order
DOKU checkout
webhook/check-payment
kitchen status update
owner dashboard
```

7. Keep old DB read-only backup until confidence is high.

Important:

```txt
Do not use prisma migrate reset.
Do not run migrate dev against production until migration history is baselined.
```

### 2. Upstash Redis -> Redis on VPS

Current boundary:

```txt
src/lib/redis.ts
src/lib/rate-limit.ts
```

Recommended future work before migration:

```txt
create a small CacheStore interface
create a small RateLimiter interface
provide Upstash implementation and Redis TCP implementation
```

Migration direction:

```txt
@upstash/redis REST -> redis/ioredis TCP client
@upstash/ratelimit -> custom sliding-window limiter or redis-rate-limiter library
```

Operational notes:

```txt
Cache data is disposable.
Rate-limit counters are disposable.
No data migration needed for cache.
Use REDIS_URL for TCP Redis.
Keep app working when Redis is down by failing open for cache/rate-limit, as current code does.
```

### 3. Supabase/Patrins image storage -> S3-compatible storage

Current boundary:

```txt
src/lib/image-storage.ts
src/app/api/upload/route.ts
src/lib/image-url.ts
```

Recommended future provider shape:

```ts
type ImageStorageProvider = "supabase" | "patrins" | "s3" | "local";
```

Recommended env shape:

```env
IMAGE_STORAGE_PROVIDER="s3"
S3_ENDPOINT="https://..."
S3_REGION="auto"
S3_BUCKET="cafe-gonku-menu-images"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_PUBLIC_BASE_URL="https://cdn.example.com"
```

Migration steps:

1. Implement new provider inside `src/lib/image-storage.ts` or `src/lib/storage/s3.ts`.
2. Upload new images to S3-compatible storage.
3. Keep old image URLs working.
4. Optional: backfill old images asynchronously:

```txt
download old image -> upload to new provider -> update Menu.imageUrl/imagePath/provider
```

5. Do not delete old provider until all active menu images are confirmed accessible.

Important:

```txt
For horizontal scaling, avoid local disk unless there is shared storage or file sync.
Cloudflare R2 or MinIO is better for portability.
```

### 4. Supabase Realtime -> provider-neutral realtime

Current boundary:

```txt
src/lib/supabase.ts sendBroadcast()
src/hooks/use-realtime-order.ts
src/hooks/use-kitchen-orders.ts
src/hooks/use-realtime-menu-updates.ts
```

Minimum migration path:

```txt
Keep polling fallback.
Disable realtime first if needed.
App remains usable with 5-10 second refresh delay.
```

Better future shape:

```ts
interface RealtimeBus {
  publish(channel: string, event: string, payload: unknown): Promise<void>
}
```

Possible implementations:

```txt
SupabaseRealtimeBus
RedisPubSubBus
NoopRealtimeBus
```

Client options:

```txt
1. Keep polling only for small traffic.
2. Add Server-Sent Events backed by Redis pub/sub.
3. Add WebSocket server backed by Redis pub/sub.
```

For 100-300 orders/day, polling fallback alone is acceptable if Supabase Realtime becomes a problem.

### 5. DOKU -> another payment gateway

Current boundary:

```txt
src/lib/doku.ts
src/hooks/use-doku-checkout.ts
src/app/api/payments/doku/notification/route.ts
src/features/orders/order.service.ts
src/lib/payment-notification.ts
```

Current generic fields:

```txt
paymentRedirectUrl
paymentGatewayOrderId
paymentStatus
paymentMethod
```

Recommended future shape when adding second gateway:

```ts
interface PaymentGateway {
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  getStatus(gatewayOrderId: string): Promise<GatewayPaymentStatus>;
  verifyWebhook(request: Request): Promise<PaymentWebhookEvent>;
}
```

Do not build this abstraction until there is a second real gateway. For now, DOKU-only is simpler and correct.

Payment gateway policy:

```txt
Never build our own payment gateway.
Always use a licensed external provider such as DOKU, Midtrans, Xendit, or another regulated provider.
This app only creates checkout sessions, verifies webhooks, checks payment status, and records payment state.
```

Reason:

```txt
Payment gateway infrastructure requires banking/payment compliance, fraud handling, settlement, reconciliation, dispute handling, security reviews, and regulatory obligations.
For Cafe Gonku, this is out of scope and not worth building.
```

If DOKU must be replaced later, migrate by adding a second provider adapter and keeping domain fields generic. Do not rename database fields to the new vendor name.

Example target structure only when needed:

```txt
src/lib/payments/
  types.ts
  doku.ts
  midtrans.ts
  pak-kasir.ts
  index.ts
```

Migration from DOKU to another provider should be incremental:

```txt
1. Keep existing DOKU records readable.
2. Add new provider implementation.
3. Route new checkouts to the new provider via env/config.
4. Keep old DOKU webhook/status check active until all old pending payments are settled or expired.
5. Do not mutate historical paymentGatewayOrderId values.
```

## VPS-first future architecture

If managed services become too expensive, a practical VPS deployment can be:

```txt
VPS
  Docker Compose
    app: Next.js
    postgres: PostgreSQL
    redis: Redis
    caddy/nginx: TLS + reverse proxy
    backup: pg_dump cron
  optional:
    minio: S3-compatible object storage
```

Minimum production operations:

```txt
- domain + SSL
- firewall
- database backup every night
- backup stored offsite, not only on VPS
- restore test at least once
- uptime monitor
- Sentry enabled
- disk/RAM monitoring
```

VPS-only without offsite backup is not safe production.

## Decision checklist before migration

Before migrating any provider, answer:

```txt
1. What exact limit/cost/latency did we hit?
2. Which metric proves it?
3. Can optimization fix it without migration?
4. What data must be migrated?
5. What is the rollback plan?
6. What is the expected downtime?
7. Has backup been tested?
8. Which env vars/code files change?
9. Which manual E2E tests must pass?
```

If answers are unclear, do not migrate yet.

## Manual E2E after provider changes

Run after any provider migration:

```txt
1. Owner login
2. Kitchen login
3. Create/edit menu image
4. QR table ordering
5. Create checkout
6. Pay via DOKU sandbox/live test method
7. DOKU webhook/check-payment updates order to PAID
8. Kitchen sees paid order
9. Kitchen changes PAID -> PREPARING -> READY -> SERVED
10. Customer tracking updates
11. Owner dashboard updates revenue/order count
12. Refresh browser and confirm state persists
```

Verification commands:

```sh
pnpm prisma:generate
npx tsc --noEmit
npx eslint . --max-warnings=999
pnpm build
```

## Recommended current plan

Do now:

```txt
- keep current managed services
- deploy/test with real cafe workflow
- monitor limits, latency, and cost
- maintain this document
- add backup/restore procedure before real production
```

Do later only if needed:

```txt
- Redis adapter for local Redis
- S3-compatible image storage provider
- RealtimeBus abstraction
- PaymentGateway abstraction when adding second gateway
- database migration baseline/resolve plan
```

Do not do now:

```txt
- microservices
- Kubernetes
- full rewrite for provider independence
- migrating all services to VPS before real usage
- removing managed services before proof of pain
```

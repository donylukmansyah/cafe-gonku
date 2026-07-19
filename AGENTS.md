# AGENTS.md

## Quick start

```sh
node -v                # must be Node.js 24.15+ (below 25)
pnpm install
# Copy .env with required vars (see Environment below), then:
pnpm prisma:generate   # must run before dev/build — generates Prisma client
pnpm dev               # Next.js dev server
```

## Commands

| Task | Command |
|---|---|
| Check Node version | `pnpm check:node` |
| Dev server | `pnpm dev` |
| Build | `pnpm build` |
| Lint | `pnpm lint` (eslint flat config) |
| Typecheck | `npx tsc --noEmit` |
| Generate Prisma client | `pnpm prisma:generate` |
| Push schema to DB | `pnpm prisma:push` |
| Create migration | `pnpm prisma:migrate` |
| Seed DB | `pnpm prisma:seed` (tsx) |
| Prisma Studio | `pnpm prisma:studio` |

No test framework is installed — there are no unit/integration tests to run.

## Runtime

Use Node.js 24 LTS, version `24.15+` (below 25). Node 24.14 and earlier are blocked because a Web Streams race can trigger `TypeError: controller[kState].transformAlgorithm is not a function`.

## Environment

Required variables (`.env`):

- `DATABASE_URL` — Pooled Postgres connection (used at runtime via `@prisma/adapter-pg`)
- `DIRECT_URL` — Direct Postgres connection (used by Prisma CLI for migrations/push via `prisma.config.ts`)
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — Better Auth config
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase (image storage + realtime broadcasts)
- `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`, `DOKU_ENV`, `NEXT_PUBLIC_DOKU_ENV`, `DOKU_NOTIFICATION_URL` — Payment gateway
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — Redis caching & rate limiting
- `NEXT_PUBLIC_APP_URL`

## Architecture

See `docs/architecture.md` for source ownership and dependency direction.

- **Framework:** Next.js 16 App Router, React 19, React Compiler enabled, `cacheComponents: true`
- **DB:** Prisma 7 with `engineType = "client"` and `@prisma/adapter-pg` driver adapter — no binary engine
- **Auth:** Better Auth (`src/server/auth/auth.ts`) with email/password, roles `OWNER` | `KITCHEN`
- **Styling:** Tailwind CSS v4 (CSS-first config in `globals.css`, no `tailwind.config.*`), shadcn/ui `new-york` style
- **State:** Zustand (cart), SWR (server data), Supabase Realtime (kitchen/order channels)
- **Payments:** DOKU Checkout
- **Path alias:** `@/*` → `./src/*`

## Key directories

```
src/app/               # Next.js routes, layouts, loading states, route-local UI
src/features/          # Feature-owned UI, hooks, schemas, types, and business logic
src/server/            # Server-only infrastructure (auth, DB, cache, HTTP, payment, realtime, storage)
src/shared/            # Narrow cross-feature utilities, client integrations, and generic hooks
src/components/ui/     # Shared shadcn/ui primitives
src/components/providers/ # App-wide providers
prisma/schema.prisma   # 13 models, 6 enums
prisma/seed.ts         # Seeds tables/sample menus and optional env-driven bootstrap users
```

## Conventions

- Keep `src/app` as the delivery layer: authenticate, validate, call a feature module, return a response.
- Keep feature-owned schemas, types, hooks, UI, and business logic together under `src/features/<feature>/`.
- Server business modules live under `src/features/<feature>/server/`; infrastructure lives under `src/server/`.
- Client Components must not import `src/server/*`; `src/server/*` must not import `src/features/*`.
- Validate requests with each feature's Zod schema; route handlers use `apiResponse()`/`apiError()` from `src/server/http/api-utils.ts`.
- Client fetches go through `apiFetch()` from `src/shared/client/api-client.ts` (auto-shows sonner toasts on error).
- Dates use Asia/Jakarta helpers from `src/shared/cafe-date.ts`; `formatPrice()` in `src/shared/utils.ts` outputs IDR.
- Image storage lives in `src/server/storage/image-storage.ts`; cache, rate-limit, and realtime infrastructure stay under `src/server/`.
- Server auth: use `getServerSession()` and `requireRole()` from `src/server/auth/server-auth.ts`.
- Dark mode is hardcoded (`className="dark"` on root layout).

## Vendor portability

- See `docs/vendor-portability.md` before changing Supabase, Upstash Redis, image storage, realtime, or payment provider code.
- Keep vendor SDK imports behind `src/server/*` infrastructure seams where practical.
- Do not migrate providers without measured limit/cost/latency pain, backup plan, rollback plan, and manual E2E checklist.
- Current strategy: managed-first, portable-core. Avoid microservices/Kubernetes/provider-abstraction rewrites until there is real operational need.

## Prisma gotchas

- **Two connection strings:** `DATABASE_URL` (pooled, runtime) vs `DIRECT_URL` (direct, CLI). Mixing them up breaks migrations or causes pooler errors.
- **Driver adapter:** Prisma client uses `PrismaPg` adapter — raw SQL uses `pg` driver syntax, not Prisma binary engine.
- **After schema changes:** run `pnpm prisma:generate` to regenerate the client before `dev` or `build`.
- `prisma.config.ts` at repo root configures the CLI datasource separately from the runtime client in `src/server/db/prisma.ts`.

## Security note

`.env` is correctly listed in `.gitignore` (`.env*` pattern) and is not git-tracked. Do not commit secrets — verify with `git status` before pushing.

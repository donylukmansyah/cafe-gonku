# AGENTS.md

## Quick start

```sh
pnpm install
# Copy .env with required vars (see Environment below), then:
pnpm prisma:generate   # must run before dev/build — generates Prisma client
pnpm dev               # Next.js dev server
```

## Commands

| Task | Command |
|---|---|
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

## Environment

Required variables (`.env`):

- `DATABASE_URL` — Pooled Postgres connection (used at runtime via `@prisma/adapter-pg`)
- `DIRECT_URL` — Direct Postgres connection (used by Prisma CLI for migrations/push via `prisma.config.ts`)
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — Better Auth config
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase (image storage + realtime broadcasts)
- `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` — Payment gateway
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — Redis caching & rate limiting
- `PATRINS_API_KEY`, `PATRINS_FOLDER_ID` — Patrins image hosting (primary, Supabase is fallback)
- `NEXT_PUBLIC_APP_URL`

## Architecture

- **Framework:** Next.js 16 App Router, React 19, React Compiler enabled, `cacheComponents: true`
- **DB:** Prisma 7 with `engineType = "client"` and `@prisma/adapter-pg` driver adapter — no binary engine
- **Auth:** Better Auth (`src/lib/auth.ts`) with email/password, roles `ADMIN` | `KITCHEN`
- **Styling:** Tailwind CSS v4 (CSS-first config in `globals.css`, no `tailwind.config.*`), shadcn/ui `new-york` style
- **State:** Zustand (cart), SWR (server data), Supabase Realtime (kitchen/order channels)
- **Payments:** Midtrans Snap
- **Path alias:** `@/*` → `./src/*`

## Key directories

```
src/app/(auth)/        # Login page
src/app/(customer)/    # Customer ordering flow (scans table QR → order → track)
src/app/(kitchen)/     # Kitchen order queue display
src/app/admin/         # Admin dashboard (menus, tables, analytics)
src/app/api/           # Route handlers (auth, menus, orders, upload, webhooks)
src/features/          # Service layer (*.service.ts) — business logic
src/lib/               # Shared infra (prisma, auth, redis, supabase, midtrans, utils)
src/validations/       # Zod 4 schemas for request validation
src/types/             # TypeScript types and Midtrans type declarations
prisma/schema.prisma   # 12 models, enums for roles/status/categories
prisma/seed.ts         # Seeds admin+kitchen users, tables, sample menus
```

## Conventions

- Validate requests with Zod schemas from `src/validations/` — server handlers use `apiResponse()`/`apiError()` from `src/lib/api-utils.ts`
- Client fetches go through `apiFetch()` from `src/lib/api-client.ts` (auto-shows sonner toasts on error)
- Dates use Asia/Jakarta timezone helpers from `src/lib/cafe-date.ts`
- Currency formatting: `formatPrice()` outputs IDR (Indonesian Rupiah)
- Image upload: Patrins API primary, Supabase Storage fallback — see `src/lib/image-storage.ts`
- Cache tags defined in `src/lib/cache-tags.ts`; rate limits in `src/lib/rate-limit.ts`
- Realtime channel names in `src/lib/realtime-channels.ts`
- Server auth: use `getServerSession()` and `requireRole()` from `src/lib/server-auth.ts`
- Dark mode is hardcoded (`className="dark"` on root layout)

## Prisma gotchas

- **Two connection strings:** `DATABASE_URL` (pooled, runtime) vs `DIRECT_URL` (direct, CLI). Mixing them up breaks migrations or causes pooler errors.
- **Driver adapter:** Prisma client uses `PrismaPg` adapter — raw SQL uses `pg` driver syntax, not Prisma binary engine.
- **After schema changes:** run `pnpm prisma:generate` to regenerate the client before `dev` or `build`.
- `prisma.config.ts` at repo root configures the CLI datasource separately from the runtime client in `src/lib/prisma.ts`.

## Security note

The `.env` file is present in the repo despite `.gitignore` listing `.env*`. Do not commit secrets. Verify `.gitignore` is working before pushing.

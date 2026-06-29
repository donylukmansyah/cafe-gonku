# Cafe Gonku

QR-based cafe ordering system built with Next.js 16, React 19, Prisma 7, Supabase Realtime, Better Auth, Upstash Redis, and DOKU Checkout.

## Runtime requirements

Use Node.js LTS only:

```txt
Node.js 20.19+ or 22 LTS
pnpm 10+
```

Do not use Node.js 24 for local development/runtime. Newer Web Streams internals can trigger Next.js dev/render errors such as:

```txt
TypeError: controller[kState].transformAlgorithm is not a function
```

Recommended with `nvm-windows`:

```sh
nvm install 22
nvm use 22
node -v
```

If you cannot change global Node.js, use project-local portable Node 22:

```powershell
.\scripts\node22-shell.ps1
```

This opens a shell with project-local Node 22 active.

The app enforces this via:

```sh
pnpm check:node
```

## Quick start

```sh
pnpm install
pnpm prisma:generate
pnpm dev
```

Open:

```txt
http://localhost:3000
```

## Useful commands

| Task | Command |
|---|---|
| Open local Node 22 shell | `pnpm node22:shell` |
| Check Node version | `pnpm check:node` |
| Dev server | `pnpm dev` |
| Build | `pnpm build` |
| Start production server | `pnpm start` |
| Lint | `pnpm lint` |
| Typecheck | `npx tsc --noEmit` |
| Generate Prisma client | `pnpm prisma:generate` |
| Push Prisma schema | `pnpm prisma:push` |
| Seed database | `pnpm prisma:seed` |
| Prisma Studio | `pnpm prisma:studio` |

## Payment runtime

Runtime payment provider is DOKU Checkout.

Required env keys:

```env
DOKU_CLIENT_ID=
DOKU_SECRET_KEY=
DOKU_ENV=sandbox
NEXT_PUBLIC_DOKU_ENV=sandbox
DOKU_NOTIFICATION_URL=
```

Payment domain fields are provider-neutral:

```txt
paymentRedirectUrl
paymentGatewayOrderId
```

## Seeding users

`prisma/seed.ts` reads optional bootstrap users from env. Passwords are not hardcoded in source.

```env
SEED_OWNER_EMAIL=owner@example.com
SEED_OWNER_PASSWORD=change-this-owner-password
SEED_OWNER_NAME="Owner Cafe Gonku"
SEED_KITCHEN_EMAIL=kitchen@example.com
SEED_KITCHEN_PASSWORD=change-this-kitchen-password
SEED_KITCHEN_NAME="Kitchen Staff"
```

Demo tables and sample menus are opt-in:

```env
SEED_TABLES=false
SEED_SAMPLE_DATA=false
```

Seed behavior:

```txt
upsert configured seed users
update only those users' credential accounts
clear sessions only for those seed users after password change
never delete all auth accounts/sessions
skip demo tables unless SEED_TABLES=true
skip sample menus unless SEED_SAMPLE_DATA=true
```

If seed user env vars are empty, auth user seed is skipped.

## Portability / vendor migration

Untuk anti vendor lock-in dan rencana migrasi service, baca:

```txt
docs/vendor-portability.md
```

Dokumen ini menjelaskan boundary vendor, trigger migrasi, exit plan Supabase/Postgres/Redis/storage/realtime/payment, dan checklist E2E setelah provider berubah.

## Manual runtime checks

Customer flow:

```txt
/t/[qrCode]
→ choose menu
→ checkout
→ DOKU checkout opens
→ pay sandbox
→ tracking shows payment confirmed
```

Kitchen flow:

```txt
/kitchen
→ paid order appears
→ update PAID/PREPARING/READY/SERVED
→ customer tracking updates through realtime
```

Owner flow:

```txt
/owner
→ dashboard stats
/owner/menus
→ menu CRUD
/owner/tables
→ table CRUD
```

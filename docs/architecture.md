# Cafe Gonku architecture

Cafe Gonku is a feature-based modular monolith. Folder ownership follows product behavior; Next.js routing remains in `src/app`.

## Source layout

```text
src/
├── app/                    # Routes, layouts, loading states, route-local UI
├── features/               # Feature-owned UI, hooks, schemas, types, business logic
│   ├── analytics/
│   ├── auth/
│   ├── menus/
│   ├── orders/
│   ├── revenue/
│   └── tables/
├── server/                 # Server-only infrastructure and vendor integrations
│   ├── auth/
│   ├── cache/
│   ├── db/
│   ├── http/
│   ├── payment/
│   ├── rate-limit/
│   ├── realtime/
│   └── storage/
├── shared/                 # Narrow cross-feature utilities and client integrations
├── components/ui/          # Generic UI primitives
└── components/providers/   # App-wide providers
```

A feature creates only the folders it needs:

```text
features/menus/
├── components/
├── hooks/
├── server/
├── schema.ts
└── types.ts
```

## Dependency direction

```text
app        -> features, components, server, shared
components -> features, shared
features   -> server, shared, explicit feature contracts
server     -> shared
shared     -> external packages
```

Rules:

- `src/app` handles delivery: authenticate, validate, call feature logic, return/render.
- Business rules belong to their owning feature.
- `features/<feature>/server` contains server-side feature implementation.
- `src/server` contains infrastructure, not product behavior.
- Client Components never import `src/server/*`.
- `src/server/*` never imports `src/features/*`.
- Schema and types stay with their feature; no global `types` or `validations` folders.
- Generic shadcn primitives stay in `src/components/ui`.
- UI used by only one route stays in that route's `_components` folder.
- No repository interface, provider abstraction, or barrel file without a real second implementation/use case.

## Typical flows

```text
Customer UI
  -> features/orders/hooks
  -> app/api/orders
  -> features/orders/server
  -> server/db + server/payment + server/realtime
```

```text
Owner menu UI
  -> features/menus/hooks
  -> app/api/menus
  -> features/menus/server
  -> server/db + server/storage + server/cache
```

## Placement checklist

Before adding a file:

1. Owned by one product capability? Put it in `src/features/<feature>`.
2. Used by one route only? Put it in `src/app/**/_components`.
3. Server infrastructure/vendor integration? Put it in `src/server`.
4. Small and genuinely cross-feature? Put it in `src/shared`.
5. Generic visual primitive/provider? Put it in `src/components`.

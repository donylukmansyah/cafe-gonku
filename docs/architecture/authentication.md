# Authentication & Role-Based Access Control Architecture

This document describes the modern Next.js authentication architecture implemented for Cafe Gonku, leveraging Better Auth and Server Components for robust security, clean code separation, and seamless user experiences.

## Core Philosophy: Server-First Protection

The overarching principle of this architecture is **Server-First Protection**. Instead of relying on client-side routing checks or the Edge Next.js `middleware.ts`—which often struggles with complex node modules or database validations—we have adopted a pattern utilizing **Server Components and Layouts**. 

This allows us to securely validate roles by communicating directly with the primary database (via Prisma) *before* any UI or sensitive data is ever sent to the browser. 

## Technology Stack

- **Authentication Framework**: [Better Auth](https://better-auth.com/)
- **Database ORM**: Prisma
- **Validation**: Zod
- **Routing**: Next.js App Router
- **State Management**: React Hooks (`useLogin`)

## Folder Structure & Responsibility Separation

Our code structure clearly separates concerns:

```
src/
├── app/
│   ├── (auth)/login/page.tsx      # Server Component: Redirects if logged in, renders UI
│   ├── admin/layout.tsx           # Server Layout: Protects all /admin routes
│   └── (kitchen)/kitchen/layout.tsx # Server Layout: Protects all /kitchen routes
├── components/
│   └── auth/login-form.tsx        # Pure UI Client Component
├── hooks/
│   └── use-login.ts               # Login State, Validation & authClient logic
├── lib/
│   ├── auth.ts                    # Core Better Auth config (database, adapter)
│   ├── auth-client.ts             # Exported `authClient` for `useSession`
│   └── server-auth.ts             # UTILITY: `getServerSession`, `requireRole`
└── validations/
    └── auth.ts                    # Zod `loginSchema`
```

## Core Utilities (`src/lib/server-auth.ts`)

The backbone of our RBAC system is `server-auth.ts`, exposing two primary commands:

### `requireGuest()`
Used on the login/register pages. It fetches the session and immediately redirects the user to their appropriate dashboard if they are already authenticated. This prevents users from seeing the login screen unnecessarily.

### `requireRole(roleId)`
Used within layout files. It fetches the session server-side. If the session doesn't exist, it redirects to `/login`. If the session exists but the role does not match `roleId`, it redirects them to their correct role-bound dashboard (or `/` as a fallback).

## Role-Based Access Control (RBAC) Flow

1. **User attempts to access `/admin`**:
   - `app/admin/layout.tsx` (Server Component) fires.
   - It calls `await requireRole("ADMIN")`.
   - `server-auth.ts` retrieves the session via `auth.api.getSession()`.
   - **If no session:** User is redirected to `/login`.
   - **If role is 'KITCHEN':** User is redirected to `/kitchen`.
   - **If Authorized:** Layout renders the admin sidebar, header, and nested `page.tsx` children.

2. **User attempts to access `/kitchen`**:
   - `app/(kitchen)/kitchen/layout.tsx` invokes `await requireRole("KITCHEN")`.
   - Only KITCHEN personnel are permitted past this point.
   - (Note: `admin` override can be easily added within `requireRole` if admins need to view kitchen screens).

## The Login Flow

1. **UI Layer**: The user interacts with `LoginForm` (`components/auth/login-form.tsx`).
2. **Hook Layer**: User input is sent to the `useLogin` hook. Zod validations ensure input integrity.
3. **Transport Layer**: The hook calls Better Auth's `signIn.email()`.
4. **Session Creation**: Better Auth communicates with DB via Prisma, verifies credentials, creates a secure `httpOnly` cookie, and returns the session.
5. **Redirection Layer**: The hook handles the redirect (`router.push`) to the appropriate dashboard based on the user's role returned by the response or standard callback logic.

## Session Lifecycle

We utilize HTTP-only cookies managed entirely by Better Auth.
- **Creation**: On successful login via `auth-client.ts`.
- **Validation**: On every secured page load via `lib/server-auth.ts`.
- **Destruction**: On logout via `signOut` (calls server to invalidate session, clears cookies locally).

## Extensibility Strategy

Adding new roles (e.g., `CASHIER`) is trivial:
1. Update `requireRole` logic in `server-auth.ts` if specific redirect fallback is needed for the new role.
2. Create `app/(cashier)/cashier/layout.tsx`.
3. Add `await requireRole("CASHIER")` to that layout. 
4. The system automatically secures all nested routes. No sprawling middleware switch statements required.

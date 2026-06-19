import { headers } from "next/headers"
import { redirect, unstable_rethrow } from "next/navigation"
import { auth, type Session } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getDashboardPathForRole, getPostLoginRedirect, sanitizeInternalRedirect, type AppRole } from "@/lib/auth-routes"
import { cache } from "react"

type SessionUserWithRole = Session["user"] & {
    role?: "OWNER" | "KITCHEN" | string
}

const LOGIN_PATH = "/login"

/**
 * Retrieves the current session from the server using Next.js headers.
 * This is safe to use in Server Components, Layouts, and Server Actions.
 */
export const getServerSession = cache(async (): Promise<Session | null> => {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        })

        if (!session?.user?.id) {
            return null
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { isActive: true },
        })

        if (!user?.isActive) {
            return null
        }

        return session
    } catch (error) {
        unstable_rethrow(error)
        console.error("Error retrieving server session:", error)
        return null
    }
});

async function getCurrentRequestPath() {
    const requestHeaders = await headers()

    return sanitizeInternalRedirect(requestHeaders.get("x-current-path"))
}

async function getLoginRedirectPath(fallbackPath = LOGIN_PATH) {
    const currentPath = await getCurrentRequestPath()

    if (!currentPath) {
        return fallbackPath
    }

    return `${fallbackPath}?callbackUrl=${encodeURIComponent(currentPath)}`
}

/**
 * Ensures the user is authenticated and has the required role.
 * Redirects to /login if unauthenticated or unauthorized.
 * 
 * @param requiredRole The role required to access the route (e.g., "OWNER", "KITCHEN")
 * @param redirectTo The path to redirect to if unauthorized (default: "/login")
 * @returns The active session if authorized
 */
export async function requireRole(requiredRole: AppRole, redirectTo = LOGIN_PATH): Promise<Session> {
    const session = await getServerSession()

    if (!session || !session.user) {
        redirect(await getLoginRedirectPath(redirectTo))
    }

    const role = (session.user as SessionUserWithRole).role

    if (role !== requiredRole) {
        redirect(getDashboardPathForRole(role))
    }

    return session
}

/**
 * Checks if a user is already logged in and optionally redirects them to their respective dashboard.
 * Useful for the /login page to prevent authenticated users from seeing the form.
 */
export async function requireGuest(callbackUrl?: string) {
    const session = await getServerSession()

    if (session && session.user) {
        const role = (session.user as SessionUserWithRole).role

        redirect(getPostLoginRedirect(role, callbackUrl))
    }
}

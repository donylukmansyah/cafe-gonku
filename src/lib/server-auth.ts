import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth, Session } from "@/lib/auth"

/**
 * Retrieves the current session from the server using Next.js headers.
 * This is safe to use in Server Components, Layouts, and Server Actions.
 */
export async function getServerSession(): Promise<Session | null> {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        })
        return session
    } catch (error) {
        console.error("Error retrieving server session:", error)
        return null
    }
}

/**
 * Ensures the user is authenticated and has the required role.
 * Redirects to /login if unauthenticated or unauthorized.
 * 
 * @param requiredRole The role required to access the route (e.g., "ADMIN", "KITCHEN")
 * @param redirectTo The path to redirect to if unauthorized (default: "/login")
 * @returns The active session if authorized
 */
export async function requireRole(requiredRole: string, redirectTo = "/login"): Promise<Session> {
    const session = await getServerSession()

    if (!session || !session.user) {
        redirect(redirectTo)
    }

    const role = (session.user as any).role

    if (role !== requiredRole) {
        // If they have a role but it's the wrong one, we might want to redirect them to their correct dashboard
        if (role === "ADMIN") redirect("/admin")
        if (role === "KITCHEN") redirect("/kitchen")

        redirect(redirectTo)
    }

    return session
}

/**
 * Checks if a user is already logged in and optionally redirects them to their respective dashboard.
 * Useful for the /login page to prevent authenticated users from seeing the form.
 */
export async function requireGuest() {
    const session = await getServerSession()

    if (session && session.user) {
        const role = (session.user as any).role

        if (role === "ADMIN") redirect("/admin")
        if (role === "KITCHEN") redirect("/kitchen")

        // Fallback or customer dashboard
        redirect("/")
    }
}

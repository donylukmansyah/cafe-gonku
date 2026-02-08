import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Public routes - no auth required
    const publicRoutes = ["/", "/login", "/api/auth"]
    const isPublicRoute = publicRoutes.some((route) =>
        pathname === route || pathname.startsWith(route + "/")
    )

    if (isPublicRoute) {
        return NextResponse.next()
    }

    // Get session cookie (Optimistic check for Middleware - Avoids DB call in Edge)
    const sessionToken = request.cookies.get("better-auth.session_token")

    // No session cookie - redirect to login
    if (!sessionToken) {
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    // For strict role checking, we would ideally verify the session.
    // However, since middleware runs on Edge and Prisma doesn't, we skip strict DB validation here.
    // We rely on Layout/Page (Server Components) to protect the data and redirect if invalid.
    // This removes the "false negative" redirect loop caused by DB failure in middleware.
    return NextResponse.next()

    // Admin/Kitchen role checks are now handled in the Server Components/Layouts
    // because we cannot securely verify roles in Edge Middleware without a compatible adapter.
    // The previous checks relied on 'session' which is now removed.

    return NextResponse.next()
}

export const config = {
    matcher: [
        // Match all routes except static files and API
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}

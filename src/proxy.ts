import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

    // --- Content Security Policy ---
    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-eval' 'unsafe-inline' https://app.sandbox.midtrans.com https://app.midtrans.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' blob: data: https://*.supabase.co https://ui-avatars.com;
        font-src 'self' https://fonts.gstatic.com;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        frame-src 'self' https://app.sandbox.midtrans.com https://app.midtrans.com;
        connect-src 'self' https://*.supabase.co https://app.sandbox.midtrans.com https://app.midtrans.com;
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, " ").trim();

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", cspHeader);

    // --- Authentication Logic ---
    // Public routes - no auth required
    const publicRoutes = ["/", "/login", "/api/auth", "/order"]
    const isPublicRoute = publicRoutes.some((route) =>
        pathname === route || pathname.startsWith(route + "/")
    )

    let response: NextResponse | null = null;

    if (!isPublicRoute) {
        // Get session cookie (Optimistic check for Middleware - Avoids DB call in Edge)
        const sessionToken = request.cookies.get("better-auth.session_token")

        // No session cookie - redirect to login
        if (!sessionToken) {
            const loginUrl = new URL("/login", request.url)
            loginUrl.searchParams.set("callbackUrl", pathname)
            response = NextResponse.redirect(loginUrl)
        }
    }

    // If no redirect, continue to next
    if (!response) {
        response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    }

    // --- Security Headers (Apply to all responses) ---
    response.headers.set("Content-Security-Policy", cspHeader);
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.headers.set("X-XSS-Protection", "1; mode=block");

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api/orders, api/menus etc (API routes that need high performance)
         */
        {
            source: "/((?!_next/static|_next/image|favicon.ico).*)",
            missing: [
                { type: "header", key: "next-router-prefetch" },
                { type: "header", key: "purpose", value: "prefetch" },
            ],
        },
    ],
}

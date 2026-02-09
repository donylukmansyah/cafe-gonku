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

    // --- Authentication & Access Control ---
    const isAuthPage = pathname.startsWith("/login");
    const isAdminPage = pathname.startsWith("/admin");
    const isKitchenPage = pathname.startsWith("/kitchen");

    // Better Auth session check
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    // 1. Redirect to login if accessing protected pages without session
    if ((isAdminPage || isKitchenPage) && !session) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 2. Role-based Access Control
    if (session) {
        const user = session.user as { role?: string };

        // Admin only pages
        if (isAdminPage && user.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/", request.url));
        }

        // Kitchen/Admin pages
        if (isKitchenPage && user.role !== "KITCHEN" && user.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/", request.url));
        }

        // Redirect from login if already authenticated
        if (isAuthPage) {
            const redirectUrl = user.role === "ADMIN" ? "/admin" : (user.role === "KITCHEN" ? "/kitchen" : "/");
            return NextResponse.redirect(new URL(redirectUrl, request.url));
        }
    }

    // --- Prepare Response ---
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // --- Security Headers (Apply to all responses) ---
    response.headers.set("Content-Security-Policy", cspHeader);
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("X-Response-Time", `${Date.now()}`);

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

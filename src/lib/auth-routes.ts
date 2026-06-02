export const ROLE_DASHBOARD_PATHS = {
    ADMIN: "/admin",
    KITCHEN: "/kitchen",
} as const

export type AppRole = keyof typeof ROLE_DASHBOARD_PATHS

export function isAppRole(role?: string | null): role is AppRole {
    return role === "ADMIN" || role === "KITCHEN"
}

export function getDashboardPathForRole(role?: string | null) {
    return isAppRole(role) ? ROLE_DASHBOARD_PATHS[role] : "/"
}

export function sanitizeInternalRedirect(value?: string | null) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
        return null
    }

    try {
        const url = new URL(value, "http://localhost")

        if (url.origin !== "http://localhost" || url.pathname === "/login") {
            return null
        }

        return `${url.pathname}${url.search}${url.hash}`
    } catch {
        return null
    }
}

export function canRoleAccessPath(role: AppRole, path: string) {
    const dashboardPath = ROLE_DASHBOARD_PATHS[role]

    return path === dashboardPath || path.startsWith(`${dashboardPath}/`)
}

export function getPostLoginRedirect(role?: string | null, callbackUrl?: string | null) {
    if (!isAppRole(role)) {
        return "/"
    }

    const safeCallbackUrl = sanitizeInternalRedirect(callbackUrl)

    if (safeCallbackUrl && canRoleAccessPath(role, safeCallbackUrl)) {
        return safeCallbackUrl
    }

    return ROLE_DASHBOARD_PATHS[role]
}

import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { createMenuSchema } from "@/validations/menu";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { revalidateTag } from "next/cache";
import { ADMIN_DASHBOARD_CACHE_TAG, MENU_PUBLIC_CACHE_TAG } from "@/lib/cache-tags";
import { MenuService } from "@/lib/services/menu.service";
import { createApiTimer } from "@/lib/api-timing";

// GET /api/menus - List all menus
export async function GET(request: NextRequest) {
    const timer = createApiTimer("GET /api/menus");

    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const includeInactive = searchParams.get("includeInactive") === "true";
        const onlyAvailable = searchParams.get("onlyAvailable") === "true";
        const skipCache = searchParams.get("skipCache") === "true" || includeInactive;

        if (includeInactive) {
            const session = await timer.step("auth", () => getServerSession());
            if (!session) {
                timer.finish(401);
                return apiError("Unauthorized", 401);
            }

            const user = session.user as { role?: string };
            if (user.role !== "ADMIN") {
                timer.finish(403);
                return apiError("Forbidden", 403);
            }
        }

        const menus = await timer.step("menus", () =>
            MenuService.getMenus({ category, includeInactive, onlyAvailable, skipCache }),
        );

        timer.finish(200, { category, includeInactive, onlyAvailable, skipCache, count: menus.length });
        return apiResponse({ menus }, 200, skipCache ? "no-store" : undefined);
    } catch (error) {
        timer.finish(500);
        return handleApiError(error, "GET /api/menus");
    }
}

// POST /api/menus - Create menu
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401);

        const user = session.user as { role?: string };
        if (user.role !== "ADMIN") return apiError("Forbidden", 403);

        const body = await request.json();
        const validatedData = createMenuSchema.parse(body);

        const menu = await MenuService.createMenu(validatedData);

        revalidateTag(MENU_PUBLIC_CACHE_TAG, "max");
        revalidateTag(ADMIN_DASHBOARD_CACHE_TAG, "max");

        return apiResponse(menu, 201);
    } catch (error) {
        return handleApiError(error, "POST /api/menus");
    }
}

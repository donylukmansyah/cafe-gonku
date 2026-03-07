import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { createMenuSchema } from "@/validations/menu";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { revalidateTag } from "next/cache";
import { MenuService } from "@/lib/services/menu.service";

// GET /api/menus - List all menus
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const includeInactive = searchParams.get("includeInactive") === "true";
        const onlyAvailable = searchParams.get("onlyAvailable") === "true";
        const skipCache = searchParams.get("skipCache") === "true" || includeInactive;

        const menus = await MenuService.getMenus({ category, includeInactive, onlyAvailable, skipCache });

        return apiResponse({ menus }, 200, skipCache ? "no-store" : undefined);
    } catch (error) {
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        revalidateTag('public-menus', 'max' as any);

        return apiResponse(menu, 201);
    } catch (error) {
        return handleApiError(error, "POST /api/menus");
    }
}

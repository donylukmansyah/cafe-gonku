import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { updateMenuSchema } from "@/validations/menu";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { revalidateTag } from "next/cache";
import { OWNER_DASHBOARD_CACHE_TAG, MENU_PUBLIC_CACHE_TAG } from "@/lib/cache-tags";
import { REALTIME_CHANNELS } from "@/lib/realtime-channels";
import { MenuService } from "@/lib/services/menu.service";

// GET /api/menus/[id] - Get single menu
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        const menu = await MenuService.getMenuById(id);

        if (!menu) return apiError("Menu not found", 404);

        return apiResponse(menu, 200);
    } catch (error) {
        return handleApiError(error, "GET /api/menus/[id]");
    }
}

// PATCH /api/menus/[id] - Update menu
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401);

        const user = session.user as { role?: string };
        if (user.role !== "OWNER") return apiError("Forbidden", 403);

        const body = await request.json();
        const validatedData = updateMenuSchema.parse(body);

        const finalMenu = await MenuService.updateMenu(id, validatedData);

        const lib = await import("@/lib/supabase");
        await lib.sendBroadcast("menu-update", {
            menuId: finalMenu!.id,
            fullMenu: {
                id: finalMenu!.id,
                name: finalMenu!.name,
                description: finalMenu!.description,
                price: finalMenu!.price,
                imageUrl: finalMenu!.imageUrl,
                category: finalMenu!.category,
                isAvailable: finalMenu!.isAvailable,
                isActive: finalMenu!.isActive,
                highlightType: finalMenu!.highlightType,
                menuOptions: finalMenu!.menuOptions,
            },
        }, REALTIME_CHANNELS.menuUpdates);

        revalidateTag(MENU_PUBLIC_CACHE_TAG, "max");
        revalidateTag(OWNER_DASHBOARD_CACHE_TAG, "max");

        return apiResponse(finalMenu, 200);
    } catch (error) {
        return handleApiError(error, "PATCH /api/menus/[id]");
    }
}

// DELETE /api/menus/[id] - Delete menu (Hard Delete)
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401);

        const user = session.user as { role?: string };
        if (user.role !== "OWNER") return apiError("Forbidden", 403);

        await MenuService.deleteMenu(id);

        revalidateTag(MENU_PUBLIC_CACHE_TAG, "max");
        revalidateTag(OWNER_DASHBOARD_CACHE_TAG, "max");

        return apiResponse({ message: "Menu archived successfully" }, 200);
    } catch (error) {
        return handleApiError(error, "DELETE /api/menus/[id]");
    }
}

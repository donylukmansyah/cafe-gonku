import { type NextRequest } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { z } from "zod";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { revalidateTag } from "next/cache";
import { MENU_PUBLIC_CACHE_TAG } from "@/lib/cache-tags";
import { REALTIME_CHANNELS } from "@/lib/realtime-channels";
import { MenuService } from "@/lib/services/menu.service";

const updateAvailabilitySchema = z.object({
    isAvailable: z.boolean(),
});

// PATCH /api/menus/[id]/availability - Toggle menu availability (Kitchen)
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401);

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "KITCHEN" && userRole !== "ADMIN") return apiError("Forbidden", 403);

        const body = await request.json();
        const parseResult = updateAvailabilitySchema.safeParse(body);

        if (!parseResult.success) {
            return apiError("Invalid request body", 400, parseResult.error.flatten());
        }

        const { isAvailable } = parseResult.data;

        const updatedMenu = await MenuService.updateMenuAvailability(id, isAvailable);

        const lib = await import("@/lib/supabase");
        await lib.sendBroadcast("menu-update", {
            menuId: updatedMenu.id,
            isAvailable: updatedMenu.isAvailable
        }, REALTIME_CHANNELS.menuUpdates);

        revalidateTag(MENU_PUBLIC_CACHE_TAG, "max");

        return apiResponse({
            message: `Menu "${updatedMenu.name}" is now ${isAvailable ? "available" : "unavailable"}`,
            menu: updatedMenu,
        }, 200);
    } catch (error) {
        return handleApiError(error, "PATCH /api/menus/[id]/availability");
    }
}

// GET /api/menus/[id]/availability - Get menu availability status
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        const menu = await MenuService.getMenuById(id);

        if (!menu) return apiError("Menu not found", 404);

        return apiResponse({ menu: { id: menu.id, name: menu.name, isAvailable: menu.isAvailable } }, 200);
    } catch (error) {
        return handleApiError(error, "GET /api/menus/[id]/availability");
    }
}

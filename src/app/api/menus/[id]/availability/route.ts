import { type NextRequest } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { revalidateTag } from "next/cache";

// Schema for updating menu availability
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

        // Authenticate user
        const session = await getServerSession();

        if (!session) {
            return apiError("Unauthorized", 401);
        }

        const userRole = (session.user as { role?: string }).role;
        // Both Kitchen and Admin can toggle availability
        if (userRole !== "KITCHEN" && userRole !== "ADMIN") {
            return apiError("Forbidden", 403);
        }

        // Validate request body
        const body = await request.json();
        const parseResult = updateAvailabilitySchema.safeParse(body);

        if (!parseResult.success) {
            return apiError("Invalid request body", 400, parseResult.error.flatten());
        }

        const { isAvailable } = parseResult.data;

        // Check if menu exists
        const existingMenu = await prisma.menu.findUnique({
            where: { id },
            select: { id: true, name: true, isAvailable: true },
        });

        if (!existingMenu) {
            return apiError("Menu not found", 404);
        }

        // Update menu availability
        const updatedMenu = await prisma.menu.update({
            where: { id },
            data: { isAvailable },
            select: {
                id: true,
                name: true,
                category: true,
                price: true,
                imageUrl: true,
                isAvailable: true,
            },
        });

        // Emit Supabase broadcast for real-time update
        const lib = await import("@/lib/supabase");
        await lib.sendBroadcast("menu-update", {
            menuId: updatedMenu.id,
            isAvailable: updatedMenu.isAvailable
        }, "kitchen-updates");

        revalidateTag('public-menus', 'max');

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

        const menu = await prisma.menu.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                isAvailable: true,
            },
        });

        if (!menu) {
            return apiError("Menu not found", 404);
        }

        return apiResponse({ menu }, 200);
    } catch (error) {
        return handleApiError(error, "GET /api/menus/[id]/availability");
    }
}

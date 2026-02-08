import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod/v4";

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
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as { role?: string }).role;
        // Both Kitchen and Admin can toggle availability
        if (userRole !== "KITCHEN" && userRole !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Validate request body
        const body = await request.json();
        const parseResult = updateAvailabilitySchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: "Invalid request body", details: parseResult.error.flatten() },
                { status: 400 }
            );
        }

        const { isAvailable } = parseResult.data;

        // Check if menu exists
        const existingMenu = await prisma.menu.findUnique({
            where: { id },
            select: { id: true, name: true, isAvailable: true },
        });

        if (!existingMenu) {
            return NextResponse.json({ error: "Menu not found" }, { status: 404 });
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

        // TODO: Emit Socket.IO event for real-time update
        // emitToKitchen(SOCKET_EVENTS.MENU_UPDATED, updatedMenu);

        return NextResponse.json({
            message: `Menu "${updatedMenu.name}" is now ${isAvailable ? "available" : "unavailable"}`,
            menu: updatedMenu,
        });
    } catch (error) {
        console.error("[PATCH /api/menus/[id]/availability] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
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
            return NextResponse.json({ error: "Menu not found" }, { status: 404 });
        }

        return NextResponse.json({ menu });
    } catch (error) {
        console.error("[GET /api/menus/[id]/availability] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMenuSchema } from "@/validations/menu";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { unstable_cache, revalidateTag } from "next/cache";

const getMenus = unstable_cache(
    async (category: string | null, includeInactive: boolean, onlyAvailable: boolean) => {
        return await prisma.menu.findMany({
            where: {
                ...(category && { category: category as any }),
                ...(!includeInactive && { isActive: true }),
                ...(onlyAvailable && { isAvailable: true }),
            },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
                category: true,
                isAvailable: true,
                menuOptions: {
                    select: {
                        id: true,
                        name: true,
                        isRequired: true,
                        values: {
                            select: {
                                id: true,
                                label: true,
                                priceAdjust: true,
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });
    },
    ['public-menus-list'],
    { tags: ['public-menus'] }
);

// GET /api/menus - List all menus
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const includeInactive = searchParams.get("includeInactive") === "true";
        const onlyAvailable = searchParams.get("onlyAvailable") === "true";

        // Admin might want fresh data, so we can skip cache if needed, 
        // but for now let's cache everything and rely on revalidation.
        // Actually, if includeInactive is true (Admin), we might want to bypass cache or use a different key.
        // The cache key includes these params, so it's safe.

        const menus = await getMenus(category, includeInactive, onlyAvailable);

        return apiResponse({ menus }, 200);
    } catch (error) {
        return handleApiError(error, "GET /api/menus");
    }
}

// POST /api/menus - Create menu
export async function POST(request: NextRequest) {
    try {
        // Check auth
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return apiError("Unauthorized", 401);
        }

        const user = session.user as { role?: string };
        if (user.role !== "ADMIN") {
            return apiError("Forbidden", 403);
        }

        // Validate body
        const body = await request.json();
        const validatedData = createMenuSchema.parse(body);

        // Extract options for nested create
        const { menuOptions, ...menuData } = validatedData;

        // Create menu with options
        const menu = await prisma.menu.create({
            data: {
                ...menuData,
                ...(menuOptions && {
                    menuOptions: {
                        create: menuOptions.map((option) => ({
                            name: option.name,
                            isRequired: option.isRequired,
                            values: {
                                create: option.values.map((value) => ({
                                    label: value.label,
                                    priceAdjust: value.priceAdjust,
                                })),
                            },
                        })),
                    },
                }),
            },
            include: {
                menuOptions: {
                    include: {
                        values: true,
                    },
                },
            },
        });

        revalidateTag('public-menus', 'max');

        return apiResponse(menu, 201);
    } catch (error) {
        return handleApiError(error, "POST /api/menus");
    }
}

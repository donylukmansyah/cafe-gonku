import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateMenuSchema } from "@/validations/menu";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { deleteMenuImage } from "@/lib/supabase";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { revalidateTag } from "next/cache";

// GET /api/menus/[id] - Get single menu
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        const menu = await prisma.menu.findUnique({
            where: { id },
            include: {
                menuOptions: {
                    include: {
                        values: true,
                    },
                },
            },
        });

        if (!menu) {
            return apiError("Menu not found", 404);
        }

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
        const validatedData = updateMenuSchema.parse(body);

        // Get existing menu to check for image update
        const existingMenu = await prisma.menu.findUnique({
            where: { id },
            select: { imageUrl: true, menuOptions: { include: { values: true } } }
        });

        if (!existingMenu) {
            return apiError("Menu not found", 404);
        }

        // If image is changing and there was an old image, delete the old one
        if (validatedData.imageUrl && existingMenu.imageUrl && validatedData.imageUrl !== existingMenu.imageUrl) {
            await deleteMenuImage(existingMenu.imageUrl);
        }

        // Extract options for update
        const { menuOptions, ...menuData } = validatedData;

        // Robust update using transaction to handle nested options
        const updatedMenu = await prisma.$transaction(async (tx) => {
            // 1. Update basic menu data
            await tx.menu.update({
                where: { id },
                data: menuData,
            });

            // 2. Handle menu options if provided
            if (menuOptions) {
                const currentOptionIds = existingMenu.menuOptions.map(o => o.id);
                const incomingOptionIds = menuOptions.map(o => o.id).filter(Boolean) as string[];

                // Identifying options to delete
                const optionsToDelete = currentOptionIds.filter(id => !incomingOptionIds.includes(id));
                if (optionsToDelete.length > 0) {
                    await tx.menuOption.deleteMany({
                        where: { id: { in: optionsToDelete } }
                    });
                }

                // Process each incoming option
                for (const option of menuOptions) {
                    if (option.id) {
                        const existingOption = existingMenu.menuOptions.find(o => o.id === option.id);
                        const existingValuesIds = existingOption?.values.map(v => v.id) || [];
                        const incomingValuesIds = option.values.map(v => v.id).filter(Boolean) as string[];

                        const valuesToDelete = existingValuesIds.filter(vId => !incomingValuesIds.includes(vId));
                        if (valuesToDelete.length > 0) {
                            await tx.menuOptionValue.deleteMany({
                                where: { id: { in: valuesToDelete } }
                            });
                        }

                        await tx.menuOption.update({
                            where: { id: option.id },
                            data: {
                                name: option.name,
                                isRequired: option.isRequired,
                                values: {
                                    upsert: option.values.map(val => ({
                                        where: { id: val.id || 'new-id' },
                                        create: { label: val.label, priceAdjust: val.priceAdjust },
                                        update: { label: val.label, priceAdjust: val.priceAdjust }
                                    }))
                                }
                            }
                        });
                    } else {
                        await tx.menuOption.create({
                            data: {
                                menuId: id,
                                name: option.name,
                                isRequired: option.isRequired,
                                values: {
                                    create: option.values.map(val => ({
                                        label: val.label,
                                        priceAdjust: val.priceAdjust
                                    }))
                                }
                            }
                        });
                    }
                }
            }
        });

        // Fetch final state to return
        const finalMenu = await prisma.menu.findUnique({
            where: { id },
            include: {
                menuOptions: {
                    include: {
                        values: true,
                    },
                },
            },
        });

        revalidateTag('public-menus', 'max');

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

        // Get menu first to get image URL
        const menu = await prisma.menu.findUnique({
            where: { id },
        });

        if (!menu) {
            return apiError("Menu not found", 404);
        }

        // Delete image from storage if exists
        if (menu.imageUrl) {
            await deleteMenuImage(menu.imageUrl);
        }

        await prisma.menu.delete({
            where: { id },
        });

        revalidateTag('public-menus', 'max');

        return apiResponse({ message: "Menu permanently deleted" }, 200);
    } catch (error) {
        return handleApiError(error, "DELETE /api/menus/[id]");
    }
}

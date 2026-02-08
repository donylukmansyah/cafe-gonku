import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { updateMenuSchema } from "@/validations/menu"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { deleteMenuImage } from "@/lib/supabase"
import { handleApiError } from "@/lib/api-utils"

// GET /api/menus/[id] - Get single menu
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const menu = await prisma.menu.findUnique({
            where: { id },
            include: {
                menuOptions: {
                    include: {
                        values: true,
                    },
                },
            },
        })

        if (!menu) {
            return NextResponse.json({ error: "Menu not found" }, { status: 404 })
        }

        return NextResponse.json(menu)
    } catch (error) {
        return handleApiError(error)
    }
}

// PATCH /api/menus/[id] - Update menu
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Check auth
        const session = await auth.api.getSession({
            headers: await headers(),
        })

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = session.user as { role?: string }
        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Validate body
        const body = await request.json()
        const validatedData = updateMenuSchema.parse(body)

        // Get existing menu to check for image update
        const existingMenu = await prisma.menu.findUnique({
            where: { id },
            select: { imageUrl: true, menuOptions: { include: { values: true } } }
        })

        if (!existingMenu) {
            return NextResponse.json({ error: "Menu not found" }, { status: 404 })
        }

        // If image is changing and there was an old image, delete the old one
        if (validatedData.imageUrl && existingMenu.imageUrl && validatedData.imageUrl !== existingMenu.imageUrl) {
            await deleteMenuImage(existingMenu.imageUrl)
        }

        // Extract options for update
        const { menuOptions, ...menuData } = validatedData

        // Robust update using transaction to handle nested options without breaking foreign keys
        const updatedMenu = await prisma.$transaction(async (tx) => {
            // 1. Update basic menu data
            const menu = await tx.menu.update({
                where: { id },
                data: menuData,
                include: {
                    menuOptions: {
                        include: {
                            values: true,
                        },
                    },
                },
            })

            // 2. Handle menu options if provided
            if (menuOptions) {
                // Get current IDs in DB
                const currentOptionIds = existingMenu.menuOptions.map(o => o.id)
                const incomingOptionIds = menuOptions.map(o => o.id).filter(Boolean) as string[]

                // Identify options to delete
                const optionsToDelete = currentOptionIds.filter(id => !incomingOptionIds.includes(id))

                // Delete removed options (this might fail if referenced by orders, which is safe)
                if (optionsToDelete.length > 0) {
                    await tx.menuOption.deleteMany({
                        where: { id: { in: optionsToDelete } }
                    })
                }

                // Process each incoming option
                for (const option of menuOptions) {
                    if (option.id) {
                        // Update existing option
                        const existingValuesIds = existingMenu.menuOptions
                            .find(o => o.id === option.id)?.values.map(v => v.id) || []
                        const incomingValuesIds = option.values.map(v => v.id).filter(Boolean) as string[]

                        // Values to delete
                        const valuesToDelete = existingValuesIds.filter(id => !incomingValuesIds.includes(id))
                        if (valuesToDelete.length > 0) {
                            await tx.menuOptionValue.deleteMany({
                                where: { id: { in: valuesToDelete } }
                            })
                        }

                        // Upsert values for this option
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
                        })
                    } else {
                        // Create new option
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
                        })
                    }
                }
            }

            return menu
        })

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
        })

        return NextResponse.json(finalMenu)
    } catch (error) {
        return handleApiError(error)
    }
}

// DELETE /api/menus/[id] - Delete menu (Hard Delete)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Check auth
        const session = await auth.api.getSession({
            headers: await headers(),
        })

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = session.user as { role?: string }
        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Get menu first to get image URL
        const menu = await prisma.menu.findUnique({
            where: { id },
        })

        if (!menu) {
            return NextResponse.json({ error: "Menu not found" }, { status: 404 })
        }

        // Delete image from storage if exists
        if (menu.imageUrl) {
            await deleteMenuImage(menu.imageUrl)
        }

        await prisma.menu.delete({
            where: { id },
        })

        return NextResponse.json({ success: true, message: "Menu permanently deleted" })
    } catch (error) {
        return handleApiError(error)
    }
}

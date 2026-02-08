import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createMenuSchema } from "@/validations/menu"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { handleApiError } from "@/lib/api-utils"

// GET /api/menus - List all menus
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get("category")
        const includeInactive = searchParams.get("includeInactive") === "true"

        const menus = await prisma.menu.findMany({
            where: {
                ...(category && { category: category as any }),
                ...(!includeInactive && { isActive: true }),
            },
            include: {
                menuOptions: {
                    include: {
                        values: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({ menus })
    } catch (error) {
        return handleApiError(error)
    }
}

// POST /api/menus - Create menu
export async function POST(request: NextRequest) {
    try {
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
        const validatedData = createMenuSchema.parse(body)

        // Extract options for nested create
        const { menuOptions, ...menuData } = validatedData

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
        })

        return NextResponse.json(menu, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
}

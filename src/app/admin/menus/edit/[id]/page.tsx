import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MenuForm } from "@/components/admin/menu-form"

async function getMenu(id: string) {
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

    return menu
}

export default async function EditMenuPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const menu = await getMenu(id)

    if (!menu) {
        notFound()
    }

    // Transform data for form
    const formData = {
        id: menu.id,
        name: menu.name,
        description: menu.description || undefined,
        price: menu.price,
        category: menu.category as "FOOD" | "DRINK" | "SNACK" | "DESSERT",
        imageUrl: menu.imageUrl || undefined,
        isAvailable: menu.isAvailable,
        menuOptions: menu.menuOptions.map((opt) => ({
            id: opt.id,
            name: opt.name,
            isRequired: opt.isRequired,
            values: opt.values.map((val) => ({
                id: val.id,
                label: val.label,
                priceAdjust: val.priceAdjust,
            })),
        })),
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Edit Menu</h1>
                <p className="text-muted-foreground">
                    Edit informasi menu "{menu.name}"
                </p>
            </div>

            <MenuForm initialData={formData} isEdit />
        </div>
    )
}

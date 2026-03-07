import { prisma } from "@/lib/prisma";
import { CreateMenuInput, UpdateMenuInput } from "@/validations/menu";
import { deleteMenuImage } from "@/lib/supabase";

export class MenuService {
    static async getMenus(options: {
        category?: string | null,
        includeInactive?: boolean,
        onlyAvailable?: boolean,
        skipCache?: boolean
    } = {}) {
        const { category, includeInactive, onlyAvailable, skipCache } = options;

        const whereClause = {
            ...(category && { category: category as any }),
            ...(!includeInactive && { isActive: true }),
            ...(onlyAvailable && { isAvailable: true }),
        };

        const selectClause = {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            category: true,
            isAvailable: true,
            isActive: true,
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
        };

        // If skipCache is provided or we need inactive items (for admin), bypass Next.js data cache manually
        // If not, use standard caching. Wait, Next.js cache components handle this on route level or file level.
        // For services, we just return the promise. Caching can be applied using Next.js 16 'use cache' in a wrapper or route.
        return await prisma.menu.findMany({
            where: whereClause,
            select: selectClause,
            orderBy: { createdAt: "desc" },
        });
    }

    static async getMenuById(id: string) {
        return await prisma.menu.findUnique({
            where: { id },
            include: {
                menuOptions: {
                    include: { values: true },
                },
            },
        });
    }

    static async createMenu(data: CreateMenuInput) {
        const { menuOptions, ...menuData } = data;

        return await prisma.menu.create({
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
                                }))
                            }
                        }))
                    }
                })
            },
            include: {
                menuOptions: { include: { values: true } }
            }
        });
    }

    static async updateMenu(id: string, data: UpdateMenuInput) {
        const existingMenu = await prisma.menu.findUnique({
            where: { id },
            select: { imageUrl: true, menuOptions: { include: { values: true } } }
        });

        if (!existingMenu) {
            throw new Error("Menu not found");
        }

        if (data.imageUrl && existingMenu.imageUrl && data.imageUrl !== existingMenu.imageUrl) {
            await deleteMenuImage(existingMenu.imageUrl);
        }

        const { menuOptions, ...menuData } = data;

        await prisma.$transaction(async (tx) => {
            await tx.menu.update({ where: { id }, data: menuData });

            if (menuOptions) {
                const currentOptionIds = existingMenu.menuOptions.map(o => o.id);
                const incomingOptionIds = menuOptions.map(o => o.id).filter(Boolean) as string[];

                const optionsToDelete = currentOptionIds.filter(id => !incomingOptionIds.includes(id));
                if (optionsToDelete.length > 0) {
                    await tx.menuOption.deleteMany({ where: { id: { in: optionsToDelete } } });
                }

                for (const option of menuOptions) {
                    if (option.id) {
                        const existingOption = existingMenu.menuOptions.find(o => o.id === option.id);
                        const existingValuesIds = existingOption?.values.map(v => v.id) || [];
                        const incomingValuesIds = option.values.map(v => v.id).filter(Boolean) as string[];

                        const valuesToDelete = existingValuesIds.filter(vId => !incomingValuesIds.includes(vId));
                        if (valuesToDelete.length > 0) {
                            await tx.menuOptionValue.deleteMany({ where: { id: { in: valuesToDelete } } });
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

        return await this.getMenuById(id);
    }

    static async updateMenuAvailability(id: string, isAvailable: boolean) {
        const existingMenu = await prisma.menu.findUnique({
            where: { id },
            select: { id: true, name: true, isAvailable: true },
        });

        if (!existingMenu) {
            throw new Error("Menu not found");
        }

        return await prisma.menu.update({
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
    }

    static async deleteMenu(id: string) {
        const menu = await prisma.menu.findUnique({
            where: { id },
            select: { imageUrl: true },
        });

        if (!menu) {
            throw new Error("Menu not found");
        }

        if (menu.imageUrl) {
            await deleteMenuImage(menu.imageUrl);
        }

        await prisma.orderItem.deleteMany({ where: { menuId: id } });
        await prisma.menu.delete({ where: { id } });

        return true;
    }
}

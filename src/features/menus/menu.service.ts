import { prisma } from "@/lib/prisma";
import { deleteMenuImage } from "@/lib/supabase";
import type { CreateMenuInput, UpdateMenuInput } from "@/validations/menu";

export class MenuService {
  static async getMenus(options: {
    category?: string | null;
    includeInactive?: boolean;
    onlyAvailable?: boolean;
    skipCache?: boolean;
  } = {}) {
    const { category, includeInactive, onlyAvailable } = options;

    return prisma.menu.findMany({
      where: {
        ...(category ? { category: category as never } : {}),
        ...(includeInactive ? {} : { isActive: true }),
        ...(onlyAvailable ? { isAvailable: true } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        category: true,
        isAvailable: true,
        isActive: true,
        highlightType: true,
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
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async getMenuById(id: string) {
    return prisma.menu.findUnique({
      where: { id },
      include: {
        menuOptions: {
          include: {
            values: true,
          },
        },
      },
    });
  }

  static async createMenu(data: CreateMenuInput) {
    const { menuOptions, ...menuData } = data;

    return prisma.menu.create({
      data: {
        ...menuData,
        ...(menuOptions?.length
          ? {
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
            }
          : {}),
      },
      include: {
        menuOptions: {
          include: {
            values: true,
          },
        },
      },
    });
  }

  static async updateMenu(id: string, data: UpdateMenuInput) {
    const existingMenu = await prisma.menu.findUnique({
      where: { id },
      include: {
        menuOptions: {
          include: {
            values: true,
          },
        },
      },
    });

    if (!existingMenu) {
      throw new Error("Menu not found");
    }

    if (
      data.imageUrl !== undefined &&
      existingMenu.imageUrl &&
      data.imageUrl !== existingMenu.imageUrl
    ) {
      await deleteMenuImage(existingMenu.imageUrl);
    }

    const { menuOptions, ...menuData } = data;

    await prisma.$transaction(async (tx) => {
      await tx.menu.update({
        where: { id },
        data: menuData,
      });

      if (!menuOptions) {
        return;
      }

      const existingOptionsById = new Map(
        existingMenu.menuOptions.map((option) => [option.id, option]),
      );

      const incomingOptionIds = new Set(
        menuOptions
          .map((option) => option.id)
          .filter((optionId): optionId is string => Boolean(optionId)),
      );

      const optionsToDelete = existingMenu.menuOptions
        .filter((option) => !incomingOptionIds.has(option.id))
        .map((option) => option.id);

      if (optionsToDelete.length) {
        await tx.menuOption.deleteMany({
          where: {
            id: {
              in: optionsToDelete,
            },
          },
        });
      }

      for (const option of menuOptions) {
        if (option.id && existingOptionsById.has(option.id)) {
          await tx.menuOption.update({
            where: {
              id: option.id,
            },
            data: {
              name: option.name,
              isRequired: option.isRequired,
            },
          });

          const existingOption = existingOptionsById.get(option.id)!;
          const existingValueIds = new Set(existingOption.values.map((value) => value.id));
          const incomingValueIds = new Set(
            option.values
              .map((value) => value.id)
              .filter((valueId): valueId is string => Boolean(valueId)),
          );

          const valuesToDelete = existingOption.values
            .filter((value) => !incomingValueIds.has(value.id))
            .map((value) => value.id);

          if (valuesToDelete.length) {
            await tx.menuOptionValue.deleteMany({
              where: {
                id: {
                  in: valuesToDelete,
                },
              },
            });
          }

          for (const value of option.values) {
            if (value.id && existingValueIds.has(value.id)) {
              await tx.menuOptionValue.update({
                where: {
                  id: value.id,
                },
                data: {
                  label: value.label,
                  priceAdjust: value.priceAdjust,
                },
              });
              continue;
            }

            await tx.menuOptionValue.create({
              data: {
                menuOptionId: option.id,
                label: value.label,
                priceAdjust: value.priceAdjust,
              },
            });
          }

          continue;
        }

        await tx.menuOption.create({
          data: {
            menuId: id,
            name: option.name,
            isRequired: option.isRequired,
            values: {
              create: option.values.map((value) => ({
                label: value.label,
                priceAdjust: value.priceAdjust,
              })),
            },
          },
        });
      }
    });

    return this.getMenuById(id);
  }

  static async updateMenuAvailability(id: string, isAvailable: boolean) {
    const existingMenu = await prisma.menu.findUnique({
      where: { id },
      select: { id: true, name: true, isAvailable: true },
    });

    if (!existingMenu) {
      throw new Error("Menu not found");
    }

    return prisma.menu.update({
      where: { id },
      data: { isAvailable },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        imageUrl: true,
        isAvailable: true,
        isActive: true,
        highlightType: true,
      },
    });
  }

  static async deleteMenu(id: string) {
    const menu = await prisma.menu.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!menu) {
      throw new Error("Menu not found");
    }

    return prisma.menu.update({
      where: { id },
      data: {
        isActive: false,
        isAvailable: false,
      },
      select: {
        id: true,
      },
    });
  }
}

import { MenuCategory, Prisma } from "@prisma/client";
import { deleteMenuImage } from "@/server/storage/image-storage";
import { normalizeImageUrl } from "@/features/menus/image-url";
import { prisma } from "@/server/db/prisma";
import { bumpCacheVersion, cacheRemember } from "@/server/cache/redis";
import type { CreateMenuInput, UpdateMenuInput } from "@/features/menus/schema";

const menuListSelect = {
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
} satisfies Prisma.MenuSelect;

type MenuListItem = Prisma.MenuGetPayload<{ select: typeof menuListSelect }>;

function normalizeMenuListImages<T extends { imageUrl: string | null }>(menus: T[]) {
  return menus.map((menu) => ({
    ...menu,
    imageUrl: normalizeImageUrl(menu.imageUrl),
  }));
}

export class MenuService {
  static buildMenuWhere(options: {
    category?: string | null;
    includeInactive?: boolean;
    onlyAvailable?: boolean;
    q?: string | null;
    status?: string | null;
  } = {}) {
    const { category, includeInactive, onlyAvailable, q, status } = options;
    const trimmedQuery = q?.trim();

    return {
      ...(category && category !== "ALL" ? { category: category as MenuCategory } : {}),
      ...(includeInactive ? {} : { isActive: true }),
      ...(onlyAvailable ? { isAvailable: true } : {}),
      ...(trimmedQuery ? { name: { contains: trimmedQuery, mode: "insensitive" as const } } : {}),
      ...(status === "ACTIVE" ? { isActive: true } : {}),
      ...(status === "INACTIVE" ? { isActive: false } : {}),
      ...(status === "AVAILABLE" ? { isAvailable: true } : {}),
      ...(status === "OUT_OF_STOCK" ? { isAvailable: false } : {}),
    } satisfies Prisma.MenuWhereInput;
  }

  static async getMenus(options: {
    category?: string | null;
    includeInactive?: boolean;
    onlyAvailable?: boolean;
    skipCache?: boolean;
    q?: string | null;
    status?: string | null;
  } = {}) {
    const { category, includeInactive, onlyAvailable, skipCache, q, status } = options;
    const canUseCache = !skipCache && !includeInactive && !q && !status;

    return cacheRemember<MenuListItem[]>({
      scope: "menus",
      key: `list:${category ?? "all"}:${onlyAvailable ? "available" : "all"}`,
      ttlSeconds: 300,
      enabled: canUseCache,
      load: () =>
        prisma.menu.findMany({
          where: this.buildMenuWhere({ category, includeInactive, onlyAvailable, q, status }),
          select: menuListSelect,
          orderBy: {
            createdAt: "desc",
          },
        }).then(normalizeMenuListImages),
    });
  }

  static async getMenusPage(options: {
    page?: number;
    limit?: number;
    category?: string | null;
    includeInactive?: boolean;
    onlyAvailable?: boolean;
    q?: string | null;
    status?: string | null;
  } = {}) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(Math.max(1, options.limit ?? 15), 100);
    const where = this.buildMenuWhere(options);

    const [menus, total] = await prisma.$transaction([
      prisma.menu.findMany({
        where,
        select: menuListSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.menu.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      menus: normalizeMenuListImages(menus),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  static async getMenuById(id: string) {
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

    return menu ? { ...menu, imageUrl: normalizeImageUrl(menu.imageUrl) } : null;
  }

  static async createMenu(data: CreateMenuInput) {
    const { menuOptions, ...menuData } = data;

    const menu = await prisma.menu.create({
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

    await bumpCacheVersion("menus");
    await bumpCacheVersion("analytics");

    return menu;
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

    await bumpCacheVersion("menus");
    await bumpCacheVersion("analytics");

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

    const menu = await prisma.menu.update({
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

    await bumpCacheVersion("menus");

    return menu;
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

    const archivedMenu = await prisma.menu.update({
      where: { id },
      data: {
        isActive: false,
        isAvailable: false,
      },
      select: {
        id: true,
      },
    });

    await bumpCacheVersion("menus");
    await bumpCacheVersion("analytics");

    return archivedMenu;
  }
}

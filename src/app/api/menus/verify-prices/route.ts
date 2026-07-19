import { z } from "zod";
import { apiResponse, handleApiError, apiError } from "@/server/http/api-utils";
import { prisma } from "@/server/db/prisma";
import { checkRateLimit, getClientIp } from "@/server/rate-limit/rate-limit";
import { computePriceHash, buildPriceHashItems } from "@/features/orders/server/price-hash";
import { createApiTimer } from "@/server/http/api-timing";

const verifyPricesSchema = z.object({
    tableId: z.string().optional(),
    items: z.array(z.object({ 
        menuId: z.string(),
        price: z.number(),
        selectedOptions: z.array(z.object({
            valueId: z.string(),
            priceAdjust: z.number(),
        })).optional().default([]),
    })),
});

export async function POST(request: Request) {
    const timer = createApiTimer("POST /api/menus/verify-prices");
    let status = 200;
    let itemCount = 0;
    let verifiedResult: boolean | undefined;

    try {
        const { items, tableId } = await timer.step("parseBody", async () => {
            const body = await request.json();
            return verifyPricesSchema.parse(body);
        });
        itemCount = items.length;

        const rateLimit = await timer.step("rateLimit", () =>
            checkRateLimit("priceVerify", `${getClientIp(request)}:${tableId ?? "no-table"}`),
        );
        if (!rateLimit.success) {
            status = 429;
            return apiError("Terlalu banyak request untuk meja ini. Coba lagi sebentar.", status);
        }

        const menuIds = [...new Set(items.map(i => i.menuId))];
        const menus = await timer.step("loadMenus", () => prisma.menu.findMany({
            where: { id: { in: menuIds } },
            select: {
                id: true,
                name: true,
                price: true,
                isAvailable: true,
                isActive: true,
                menuOptions: {
                    select: {
                        values: {
                            select: {
                                id: true,
                                priceAdjust: true,
                            },
                        },
                    },
                },
            },
        }));

        const menuMap = new Map(menus.map(m => [m.id, m]));
        const changes: {
            menuId: string;
            name: string;
            oldPrice: number;
            newPrice: number;
            unavailable?: boolean;
            optionChanges?: { valueId: string; oldAdjust: number; newAdjust: number }[];
        }[] = [];

        for (const item of items) {
            const menu = menuMap.get(item.menuId);

            if (!menu || !menu.isActive) {
                changes.push({
                    menuId: item.menuId,
                    name: menu?.name ?? "Menu tidak ditemukan",
                    oldPrice: item.price,
                    newPrice: 0,
                    unavailable: true,
                });
                continue;
            }

            if (!menu.isAvailable) {
                changes.push({
                    menuId: item.menuId,
                    name: menu.name,
                    oldPrice: item.price,
                    newPrice: menu.price,
                    unavailable: true,
                });
                continue;
            }

            let hasChange = false;

            if (menu.price !== item.price) {
                hasChange = true;
            }

            const valueMap = new Map<string, number>();
            for (const opt of menu.menuOptions) {
                for (const v of opt.values) {
                    valueMap.set(v.id, v.priceAdjust);
                }
            }

            const optionChanges: { valueId: string; oldAdjust: number; newAdjust: number }[] = [];
            for (const opt of item.selectedOptions) {
                const dbAdjust = valueMap.get(opt.valueId);
                if (dbAdjust === undefined || dbAdjust !== opt.priceAdjust) {
                    hasChange = true;
                    optionChanges.push({
                        valueId: opt.valueId,
                        oldAdjust: opt.priceAdjust,
                        newAdjust: dbAdjust ?? 0,
                    });
                }
            }

            if (hasChange) {
                changes.push({
                    menuId: item.menuId,
                    name: menu.name,
                    oldPrice: item.price,
                    newPrice: menu.price,
                    ...(optionChanges.length ? { optionChanges } : {}),
                });
            }
        }

        const verified = changes.length === 0;
        verifiedResult = verified;
        let priceHash: string | undefined;

        if (verified) {
            priceHash = await timer.step("hash", async () => {
                const hashItems = buildPriceHashItems(
                    items.map(item => ({
                        menuId: item.menuId,
                        selectedOptions: item.selectedOptions.map(opt => ({ valueId: opt.valueId })),
                    })),
                    menuMap as Map<string, { price: number; menuOptions: { values: { id: string; priceAdjust: number }[] }[] }>,
                );
                return computePriceHash(hashItems);
            });
        }

        return apiResponse({
            verified,
            changes,
            priceHash,
        });
    } catch (error) {
        status = error instanceof z.ZodError ? 400 : 500;
        return handleApiError(error, "POST /api/menus/verify-prices");
    } finally {
        timer.finish(status, {
            itemCount,
            verified: verifiedResult,
        });
    }
}

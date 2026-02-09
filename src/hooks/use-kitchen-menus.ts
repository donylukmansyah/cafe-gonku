"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { apiFetch } from "@/lib/api-client";

interface Menu {
    id: string;
    name: string;
    category: "FOOD" | "DRINK" | "SNACK" | "DESSERT";
    price: number;
    imageUrl: string | null;
    isAvailable: boolean;
}

export function useKitchenMenus() {
    const [menus, setMenus] = useState<Menu[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const lastDataHashRef = useRef("");

    const getMenuHash = (items: Menu[]) => {
        return items.map(m => `${m.id}-${m.isAvailable}`).join("|");
    };

    const fetchMenus = useCallback(async (force = false) => {
        if (!isMountedRef.current || isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            const timestamp = new Date().getTime();
            const data = await apiFetch<{ menus: Menu[] }>(`/api/menus?skipCache=true&t=${timestamp}`);

            if (!isMountedRef.current) return;

            const newMenus = data.menus || [];
            const newHash = getMenuHash(newMenus);

            if (newHash !== lastDataHashRef.current || force) {
                lastDataHashRef.current = newHash;
                setMenus(newMenus);
            }

            setError(null);
        } catch (err) {
            if (!isMountedRef.current) return;
            setError("Gagal memuat menu");
        } finally {
            isFetchingRef.current = false;
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    const toggleAvailability = useCallback(
        async (menuId: string, isAvailable: boolean) => {
            // Optimistic update
            setMenus((prev) =>
                prev.map((menu) =>
                    menu.id === menuId ? { ...menu, isAvailable } : menu
                )
            );

            try {
                await apiFetch(`/api/menus/${menuId}/availability`, {
                    method: "PATCH",
                    body: JSON.stringify({ isAvailable }),
                });

                await fetchMenus(true);
                return true;
            } catch (err) {
                await fetchMenus(true);
                throw err;
            }
        },
        [fetchMenus]
    );

    const initialize = useCallback(() => {
        isMountedRef.current = true;
        fetchMenus();
        return () => {
            isMountedRef.current = false;
        };
    }, [fetchMenus]);

    const groupedMenus = useMemo(() => {
        return menus.reduce((acc, menu) => {
            const category = menu.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(menu);
            return acc;
        }, {} as Record<string, Menu[]>);
    }, [menus]);

    return {
        menus,
        groupedMenus,
        isLoading,
        error,
        fetchMenus: () => fetchMenus(true),
        toggleAvailability,
        initialize,
    };
}

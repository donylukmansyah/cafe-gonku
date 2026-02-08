"use client";

import { useState, useCallback, useRef, useMemo } from "react";

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

    // Simple hashing for menu items
    const getMenuHash = (items: Menu[]) => {
        return items.map(m => `${m.id}-${m.isAvailable}`).join("|");
    };

    const fetchMenus = useCallback(async (force = false) => {
        if (!isMountedRef.current || isFetchingRef.current) return;

        isFetchingRef.current = true;

        try {
            const res = await fetch("/api/menus");
            if (!res.ok) throw new Error("Failed to fetch menus");
            const data = await res.json();

            if (!isMountedRef.current) return;

            const newMenus = data.menus || [];
            const newHash = getMenuHash(newMenus);

            // Only update state if data changed or forced
            if (newHash !== lastDataHashRef.current || force) {
                lastDataHashRef.current = newHash;
                setMenus(newMenus);
            }

            setError(null);
        } catch (err) {
            if (!isMountedRef.current) return;
            console.error("Error fetching menus:", err);
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
                const res = await fetch(`/api/menus/${menuId}/availability`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isAvailable }),
                });

                if (!res.ok) {
                    await fetchMenus(true);
                    throw new Error("Failed to update menu availability");
                }

                // Sync hash after successful move
                await fetchMenus(true);
                return true;
            } catch (err) {
                console.error("Error updating menu:", err);
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

"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";

export interface Menu {
    id: string;
    name: string;
    category: string;
    price: number;
    isAvailable: boolean;
    isActive: boolean;
    imageUrl?: string | null;
    menuOptions: {
        id: string;
        name: string;
        values: { id: string; label: string; priceAdjust: number }[];
    }[];
}

export function useAdminMenus() {
    const [menus, setMenus] = useState<Menu[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const lastDataHashRef = useRef("");
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    const getHash = (items: Menu[]) => {
        return items.map(m => `${m.id}-${m.isAvailable}-${m.isActive}`).join("|");
    };

    const fetchMenus = useCallback(async (force = false) => {
        if (!isMountedRef.current || isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            const res = await fetch("/api/menus?includeInactive=true");
            if (!res.ok) throw new Error("Failed to fetch menus");
            const data = await res.json();

            if (!isMountedRef.current) return;

            const newMenus = data.menus || [];
            const newHash = getHash(newMenus);
            if (newHash !== lastDataHashRef.current || force) {
                lastDataHashRef.current = newHash;
                setMenus(newMenus);
            }
        } catch (error) {
            console.error(error);
            toast.error("Gagal memuat menu");
        } finally {
            isFetchingRef.current = false;
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    const initialize = useCallback(() => {
        isMountedRef.current = true;
        fetchMenus();
        return () => {
            isMountedRef.current = false;
        };
    }, [fetchMenus]);

    return {
        menus,
        isLoading,
        fetchMenus: () => fetchMenus(true),
        initialize,
    };
}

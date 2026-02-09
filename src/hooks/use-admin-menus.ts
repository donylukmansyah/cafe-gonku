"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";

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
    const { data, error, isLoading, mutate } = useSWR<{ menus: Menu[] }>(
        "/api/menus?includeInactive=true",
        apiFetch
    );

    return {
        menus: data?.menus || [],
        isLoading,
        fetchMenus: mutate,
        error
    };
}

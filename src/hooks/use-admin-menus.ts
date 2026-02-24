"use client";

import useSWR from "swr";
import { useState, useMemo, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { showConfirm, showSuccess, showError } from "@/lib/sweetalert";

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
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const { data, error, isLoading, mutate } = useSWR<{ menus: Menu[] }>(
        "/api/menus?includeInactive=true&skipCache=true",
        apiFetch,
        {
            revalidateOnFocus: false, // Less aggressive for menus
            dedupingInterval: 10000,   // Cache for 10s
        }
    );

    const menus = data?.menus || [];

    const filteredMenus = useMemo(() => {
        return menus.filter(menu => {
            const matchesSearch = menu.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === "ALL" || menu.category === categoryFilter;
            const matchesStatus = statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && menu.isActive) ||
                (statusFilter === "INACTIVE" && !menu.isActive) ||
                (statusFilter === "AVAILABLE" && menu.isAvailable) ||
                (statusFilter === "OUT_OF_STOCK" && !menu.isAvailable);

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [menus, searchQuery, categoryFilter, statusFilter]);

    const deleteMenu = useCallback(async (id: string) => {
        const result = await showConfirm(
            "Hapus Menu?",
            "Menu akan dihapus secara permanen!",
            "Ya, Hapus!",
            "warning"
        );

        if (result.isConfirmed) {
            try {
                await apiFetch(`/api/menus/${id}`, { method: "DELETE" });

                showSuccess("Menu berhasil dihapus");
                mutate(); // Refresh the data
            } catch (error) {
                showError("Gagal menghapus menu");
            }
        }
    }, [mutate]);

    const toggleAvailability = useCallback(async (id: string, currentStatus: boolean) => {
        // Optimistic Update
        const updatedMenus = menus.map(m =>
            m.id === id ? { ...m, isAvailable: !currentStatus } : m
        );

        try {
            // Apply local change immediately
            await mutate({ menus: updatedMenus }, false);

            await apiFetch(`/api/menus/${id}/availability`, {
                method: "PATCH",
                body: JSON.stringify({ isAvailable: !currentStatus }),
            });

            toast.success("Status ketersediaan diupdate");
            mutate(); // Revalidate server state
        } catch (error) {
            // Rollback on error
            mutate({ menus: updatedMenus }, false); // Fallback rollback
            // Toast error is handled by apiFetch unless options.silent is true.
        }
    }, [menus, mutate]);

    return {
        menus: filteredMenus,
        allMenus: menus,
        isLoading,
        error,
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
        statusFilter,
        setStatusFilter,
        deleteMenu,
        toggleAvailability,
        fetchMenus: mutate,
    };
}

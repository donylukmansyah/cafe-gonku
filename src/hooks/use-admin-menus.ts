"use client";

import useSWR from "swr";
import { useState, useMemo, useCallback, useDeferredValue } from "react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { showConfirm, showSuccess, showError } from "@/lib/sweetalert";
import type { Menu } from "@/types/menu";

export function useAdminMenus() {
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const deferredSearchQuery = useDeferredValue(searchQuery);

    const { data, error, isLoading, mutate } = useSWR<{ menus: Menu[] }>(
        "/api/menus?includeInactive=true&skipCache=true",
        apiFetch,
        {
            revalidateOnFocus: false, // Less aggressive for menus
            dedupingInterval: 10000,   // Cache for 10s
        }
    );

    const menus = useMemo(() => data?.menus ?? [], [data?.menus]);

    const filteredMenus = useMemo(() => {
        const normalizedSearch = deferredSearchQuery.trim().toLowerCase();

        return menus.filter(menu => {
            const matchesSearch = menu.name.toLowerCase().includes(normalizedSearch);
            const matchesCategory = categoryFilter === "ALL" || menu.category === categoryFilter;
            const matchesStatus = statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && menu.isActive) ||
                (statusFilter === "INACTIVE" && !menu.isActive) ||
                (statusFilter === "AVAILABLE" && menu.isAvailable) ||
                (statusFilter === "OUT_OF_STOCK" && !menu.isAvailable);

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [menus, deferredSearchQuery, categoryFilter, statusFilter]);

    const deleteMenu = useCallback(async (id: string) => {
        const result = await showConfirm(
            "Hapus Menu?",
            "Menu akan diarsipkan dari halaman customer, tapi riwayat order tetap aman.",
            "Ya, Arsipkan!",
            "warning"
        );

        if (result.isConfirmed) {
            try {
                await apiFetch(`/api/menus/${id}`, { method: "DELETE" });

                showSuccess("Menu berhasil diarsipkan");
                mutate(); // Refresh the data
            } catch {
                showError("Gagal mengarsipkan menu");
            }
        }
    }, [mutate]);

    const toggleAvailability = useCallback(async (id: string, currentStatus: boolean) => {
        const previousMenus = menus;
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
        } catch {
            // Rollback on error
            mutate({ menus: previousMenus }, false);
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

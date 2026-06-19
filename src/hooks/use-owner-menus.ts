"use client";

import useSWR from "swr";
import { useState, useMemo, useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { showConfirm, showSuccess, showError } from "@/lib/sweetalert";
import type { Menu } from "@/types/menu";

interface MenuPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

interface MenusResponse {
    menus: Menu[];
    pagination: MenuPagination;
}

const PAGE_SIZE = 15;

export function useOwnerMenus() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);
    const initialSearchQuery = searchParams.get("q") ?? "";
    const initialCategoryFilter = searchParams.get("category") ?? "ALL";
    const initialStatusFilter = searchParams.get("status") ?? "ALL";

    const [searchQuery, setSearchQueryState] = useState(initialSearchQuery);
    const [categoryFilter, setCategoryFilterState] = useState(initialCategoryFilter);
    const [statusFilter, setStatusFilterState] = useState(initialStatusFilter);
    const [page, setPageState] = useState(initialPage);
    const debouncedSearchQuery = useDebounce(searchQuery, 350);
    const isSearching = searchQuery.trim() !== debouncedSearchQuery.trim();

    const updateUrlParams = useCallback((next: {
        page?: number;
        q?: string;
        category?: string;
        status?: string;
    }) => {
        const params = new URLSearchParams(searchParams.toString());
        const nextPage = next.page ?? page;
        const nextQuery = next.q ?? searchQuery;
        const nextCategory = next.category ?? categoryFilter;
        const nextStatus = next.status ?? statusFilter;

        if (nextPage > 1) params.set("page", String(nextPage));
        else params.delete("page");

        if (nextQuery.trim()) params.set("q", nextQuery.trim());
        else params.delete("q");

        if (nextCategory !== "ALL") params.set("category", nextCategory);
        else params.delete("category");

        if (nextStatus !== "ALL") params.set("status", nextStatus);
        else params.delete("status");

        const queryString = params.toString();
        if (queryString === searchParams.toString()) return;

        router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    }, [categoryFilter, page, pathname, router, searchParams, searchQuery, statusFilter]);

    const menusUrl = useMemo(() => {
        const params = new URLSearchParams({
            skipCache: "true",
            page: String(page),
            limit: String(PAGE_SIZE),
        });

        const query = debouncedSearchQuery.trim();
        if (query) params.set("q", query);
        if (categoryFilter !== "ALL") params.set("category", categoryFilter);
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (statusFilter === "INACTIVE") params.set("includeInactive", "true");

        return `/api/menus?${params.toString()}`;
    }, [page, debouncedSearchQuery, categoryFilter, statusFilter]);

    const { data, error, isLoading, mutate } = useSWR<MenusResponse>(
        menusUrl,
        apiFetch,
        {
            revalidateOnFocus: false,
            dedupingInterval: 10000,
            keepPreviousData: true,
        }
    );

    const menus = useMemo(() => data?.menus ?? [], [data?.menus]);
    const pagination = data?.pagination ?? {
        page,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: page > 1,
    };

    const setPage = useCallback((nextPage: number) => {
        const safePage = Math.max(1, nextPage);
        setPageState(safePage);
        updateUrlParams({ page: safePage });
    }, [updateUrlParams]);

    useEffect(() => {
        const currentQuery = searchParams.get("q") ?? "";
        if (debouncedSearchQuery.trim() === currentQuery.trim()) return;
        updateUrlParams({ q: debouncedSearchQuery, page: 1 });
    }, [debouncedSearchQuery, searchParams, updateUrlParams]);

    const setSearchQuery = useCallback((query: string) => {
        setSearchQueryState(query);
        setPageState(1);
    }, []);

    const setCategoryFilter = useCallback((category: string) => {
        setCategoryFilterState(category);
        setPageState(1);
        updateUrlParams({ category, page: 1 });
    }, [updateUrlParams]);

    const setStatusFilter = useCallback((status: string) => {
        setStatusFilterState(status);
        setPageState(1);
        updateUrlParams({ status, page: 1 });
    }, [updateUrlParams]);

    const deleteMenu = useCallback(async (id: string) => {
        const result = await showConfirm(
            "Hapus Menu?",
            "Menu akan disembunyikan dari owner & customer. Riwayat order tetap aman.",
            "Ya, Sembunyikan!",
            "warning"
        );

        if (result.isConfirmed) {
            try {
                await apiFetch(`/api/menus/${id}`, { method: "DELETE" });

                showSuccess("Menu berhasil disembunyikan");
                if (data) {
                    await mutate({
                        ...data,
                        menus: data.menus.filter((menu) => menu.id !== id),
                        pagination: {
                            ...data.pagination,
                            total: Math.max(0, data.pagination.total - 1),
                        },
                    }, false);
                }
                mutate(); // Refresh the data
            } catch {
                showError("Gagal mengarsipkan menu");
            }
        }
    }, [data, mutate]);

    const toggleAvailability = useCallback(async (id: string, currentStatus: boolean) => {
        const previousMenus = menus;
        // Optimistic Update
        const updatedMenus = menus.map(m =>
            m.id === id ? { ...m, isAvailable: !currentStatus } : m
        );

        try {
            // Apply local change immediately
            if (data) {
                await mutate({ ...data, menus: updatedMenus }, false);
            }

            await apiFetch(`/api/menus/${id}/availability`, {
                method: "PATCH",
                body: JSON.stringify({ isAvailable: !currentStatus }),
            });

            toast.success("Status ketersediaan diupdate");
            mutate(); // Revalidate server state
        } catch {
            // Rollback on error
            if (data) {
                mutate({ ...data, menus: previousMenus }, false);
            }
            // Toast error is handled by apiFetch unless options.silent is true.
        }
    }, [data, menus, mutate]);

    return {
        menus,
        allMenus: menus,
        pagination,
        page,
        setPage,
        isLoading,
        isSearching,
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

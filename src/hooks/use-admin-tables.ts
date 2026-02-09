"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";

export type TableData = {
    id: string;
    tableNumber: number;
    qrCode: string;
    capacity: number;
    isActive: boolean;
    _count: {
        orders: number;
    };
};

export function useAdminTables() {
    const { data, error, isLoading, isValidating, mutate } = useSWR<TableData[]>(
        "/api/tables",
        apiFetch
    );

    return {
        tables: data || [],
        setTables: mutate, // For optimistic updates: mutate(newData, false)
        isLoading,
        isRefreshing: isValidating,
        fetchTables: mutate,
        error
    };
}

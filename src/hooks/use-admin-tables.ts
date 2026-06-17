"use client";

import useSWR from "swr";
import { useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { showConfirm, showSuccess } from "@/lib/sweetalert";

export type TableData = {
    id: string;
    tableNumber: number;
    qrCode: string;
    capacity: number;
    isActive: boolean;
};

export function useAdminTables() {
    const { data, error, isLoading, isValidating, mutate } = useSWR<TableData[]>(
        "/api/tables",
        apiFetch
    );

    const tables = useMemo(() => data || [], [data]);

    const createTable = useCallback(async (values: { tableNumber: number, capacity: number }, onSuccess?: () => void) => {
        try {
            await apiFetch("/api/tables", {
                method: "POST",
                body: JSON.stringify(values),
            });

            toast.success(`Meja #${values.tableNumber} berhasil dibuat`);
            mutate();
            if (onSuccess) onSuccess();
        } catch (error) {
            // apiFetch handles toast natively
            console.error(error);
        }
    }, [mutate]);

    const toggleStatus = useCallback(async (id: string, currentStatus: boolean) => {
        // Optimistic update
        const previousTables = tables;
        const updatedTables = tables.map(t => t.id === id ? { ...t, isActive: !currentStatus } : t);

        try {
            await mutate(updatedTables, false);

            await apiFetch(`/api/tables/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            mutate(); // Revalidate with server after success
        } catch {
            // Revert on error
            mutate(previousTables, false);
            // toast.error is handled natively by apiFetch
        }
    }, [tables, mutate]);

    const deleteTable = useCallback(async (id: string) => {
        const result = await showConfirm(
            "Nonaktifkan Meja?",
            "Meja akan disembunyikan dari QR customer, riwayat order tetap aman.",
            "Ya, Nonaktifkan",
            "warning"
        );

        if (!result.isConfirmed) return;

        try {
            await apiFetch(`/api/tables/${id}`, {
                method: "DELETE",
            });

            showSuccess("Berhasil", "Meja berhasil dinonaktifkan");
            mutate();
        } catch (error) {
            // showError("Gagal", "Terjadi kesalahan saat menghapus meja"); // Already handled by apiFetch toast
            console.error(error);
        }
    }, [mutate]);


    return {
        tables,
        isLoading,
        isRefreshing: isValidating,
        error,
        createTable,
        toggleStatus,
        deleteTable,
        fetchTables: mutate,
    };
}

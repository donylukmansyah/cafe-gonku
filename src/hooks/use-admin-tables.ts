"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

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
    const [tables, setTables] = useState<TableData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const lastDataHashRef = useRef("");
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    const getHash = (items: TableData[]) => {
        return items.map(t => `${t.id}-${t.isActive}-${t._count.orders}`).join("|");
    };

    const fetchTables = useCallback(async (isManual = false) => {
        if (!isMountedRef.current || isFetchingRef.current) return;
        isFetchingRef.current = true;

        if (isManual) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const res = await fetch("/api/tables");
            if (!res.ok) throw new Error("Failed to fetch tables");
            const data = await res.json();

            if (!isMountedRef.current) return;

            const newHash = getHash(data);
            if (newHash !== lastDataHashRef.current || isManual) {
                lastDataHashRef.current = newHash;
                setTables(data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Gagal memuat data meja");
        } finally {
            isFetchingRef.current = false;
            if (isMountedRef.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, []);

    const initialize = useCallback(() => {
        isMountedRef.current = true;
        fetchTables();
        return () => {
            isMountedRef.current = false;
        };
    }, [fetchTables]);

    return {
        tables,
        setTables, // For optimistic updates
        isLoading,
        isRefreshing,
        fetchTables: () => fetchTables(true),
        initialize,
    };
}

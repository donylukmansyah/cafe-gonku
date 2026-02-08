"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";

export type AnalyticsData = {
    chartData: {
        date: string;
        revenue: number;
        orders: number;
    }[];
    topMenus: {
        name: string;
        quantity: number;
        category: string;
    }[];
    totalRevenue: number;
    totalOrders: number;
};

export function useAdminAnalytics() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [days, setDays] = useState("7");
    const lastDataHashRef = useRef("");
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    // Simple hash for analytics data
    const getHash = (d: AnalyticsData) => {
        return `${d.totalRevenue}-${d.totalOrders}-${d.topMenus.length}-${d.chartData.length}`;
    };

    const fetchData = useCallback(async (force = false) => {
        if (!isMountedRef.current || isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            const res = await fetch(`/api/analytics?days=${days}`);
            if (!res.ok) throw new Error("Failed to fetch analytics");
            const result = await res.json();

            if (!isMountedRef.current) return;

            const newHash = getHash(result);
            if (newHash !== lastDataHashRef.current || force) {
                lastDataHashRef.current = newHash;
                setData(result);
            }
        } catch (error) {
            console.error(error);
            toast.error("Gagal memuat data analytics");
        } finally {
            isFetchingRef.current = false;
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [days]);

    const initialize = useCallback(() => {
        isMountedRef.current = true;
        fetchData();
        return () => {
            isMountedRef.current = false;
        };
    }, [fetchData]);

    return {
        data,
        isLoading,
        days,
        setDays,
        fetchData: () => fetchData(true),
        initialize,
    };
}

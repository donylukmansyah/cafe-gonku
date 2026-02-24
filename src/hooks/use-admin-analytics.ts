"use client";

import useSWR from "swr";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

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

const defaultData: AnalyticsData = {
    chartData: [],
    topMenus: [],
    totalRevenue: 0,
    totalOrders: 0,
};

export function useAdminAnalytics() {
    const [days, setDays] = useState("7");

    // Key depends on days, so it auto-refetches when days changes
    const { data, error, isLoading, mutate } = useSWR<AnalyticsData>(
        `/api/analytics?days=${days}`,
        apiFetch
    );

    return {
        data: data || defaultData,
        isLoading,
        days,
        setDays,
        fetchData: mutate,
        error
    };
}

"use client";

import useSWR from "swr";
import { useState } from "react";
import { apiFetch } from "@/shared/client/api-client";

export type AnalyticsData = {
    chartData: {
        date: string;
        onlineRevenue: number;
        cashRevenue: number;
        totalRevenue: number;
        orders: number;
    }[];
    topMenus: {
        name: string;
        quantity: number;
        category: string;
    }[];
    allMenuSales: {
        name: string;
        quantity: number;
        category: string;
    }[];
    totalRevenue: number;
    onlineRevenue: number;
    cashRevenue: number;
    netIncome: number;
    totalOrders: number;
};

const defaultData: AnalyticsData = {
    chartData: [],
    topMenus: [],
    allMenuSales: [],
    totalRevenue: 0,
    onlineRevenue: 0,
    cashRevenue: 0,
    netIncome: 0,
    totalOrders: 0,
};

export type PeriodMode = "preset" | "custom";

export function useOwnerAnalytics() {
    const [mode, setMode] = useState<PeriodMode>("preset");
    const [days, setDays] = useState("7");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // Build the query and label based on mode
    let queryArgs = `?days=${days}`;
    let periodLabel = `${days} Hari Terakhir`;

    if (mode === "preset") {
        const map: Record<string, string> = {
            "1": "Hari Ini",
            "7": "7 Hari Terakhir",
            "30": "30 Hari Terakhir"
        };
        periodLabel = map[days] || `${days} Hari`;
    } else if (mode === "custom" && startDate) {
        queryArgs = `?startDate=${startDate}&endDate=${endDate || startDate}`;
        if (startDate === endDate || !endDate) {
            periodLabel = new Date(startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
        } else {
            periodLabel = `${new Date(startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - ${new Date(endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
        }
    }

    const { data, error, isLoading, mutate } = useSWR<AnalyticsData>(
        `/api/analytics${queryArgs}`,
        apiFetch
    );

    return {
        data: data || defaultData,
        isLoading,
        mode,
        setMode,
        days,
        setDays,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        periodLabel,
        fetchData: mutate,
        error
    };
}

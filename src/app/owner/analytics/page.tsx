"use client"

import { useOwnerAnalytics } from "@/features/analytics/hooks/use-owner-analytics"
import "@/features/analytics/components/print-styles.css"

// Components (All memoized)
import { StatsCards } from "@/features/analytics/components/stats-cards"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { DateFilter } from "@/features/analytics/components/date-filter"
import { PdfExportButton } from "@/features/analytics/components/pdf-export-button"

const RevenueChart = dynamic(
    () => import("@/features/analytics/components/revenue-chart").then(mod => mod.RevenueChart),
    {
        ssr: false,
        loading: () => <Skeleton className="w-full h-[500px] rounded-3xl bg-zinc-900/40 border border-white/5" />
    }
)
import { TopMenus } from "@/features/analytics/components/top-menus"
import { DetailedReport } from "@/features/analytics/components/detailed-report"

export default function AnalyticsPage() {
    const {
        data,
        isLoading,
        mode,
        setMode,
        days,
        setDays,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        periodLabel
    } = useOwnerAnalytics();

    if (isLoading) {
        return <AnalyticsLoadingSkeleton />
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-6 print-container">
            {/* ===== PRINT REPORT (Only visible when printing) ===== */}
            <div className="print-header">
                {/* Report Title Bar */}
                <div className="print-title-bar">
                    <div>
                        <h1 className="print-title">Cafe Gonku</h1>
                        <p className="print-subtitle">Laporan Pendapatan</p>
                    </div>
                    <div className="print-meta">
                        <span className="print-period-badge">{periodLabel}</span>
                        <p className="print-timestamp">Dicetak: {new Date().toLocaleString('id-ID')}</p>
                    </div>
                </div>

                {/* KPI Cards Row */}
                <div className="print-kpi-row">
                    <div className="print-kpi-card print-kpi-highlight">
                        <span className="print-kpi-label">Total Pendapatan</span>
                        <span className="print-kpi-value">Rp {data.totalRevenue.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="print-kpi-card">
                        <span className="print-kpi-label">QR / Online</span>
                        <span className="print-kpi-value">Rp {data.onlineRevenue.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="print-kpi-card">
                        <span className="print-kpi-label">Pendapatan Kasir</span>
                        <span className="print-kpi-value">Rp {data.cashRevenue.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="print-kpi-card">
                        <span className="print-kpi-label">Order Lunas</span>
                        <span className="print-kpi-value">{data.totalOrders}</span>
                    </div>
                </div>
            </div>

            {/* ===== SCREEN HEADER (hidden in print) ===== */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-white/5 pb-4 relative hide-on-print">
                <div className="text-left">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                        Performance Analytics
                    </h1>
                    <p className="text-zinc-400 max-w-md">
                        Monitoring laporan pendapatan dan tren menu paling populer.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                    <DateFilter
                        mode={mode}
                        setMode={setMode}
                        days={days}
                        setDays={setDays}
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                    />
                    <PdfExportButton />
                </div>
            </div>

            {/* Stats Cards – screen only */}
            <div className="hide-on-print">
                <StatsCards
                    totalRevenue={data.totalRevenue}
                    onlineRevenue={data.onlineRevenue}
                    cashRevenue={data.cashRevenue}
                    totalOrders={data.totalOrders}
                    periodLabel={periodLabel}
                />
            </div>

            {/* Charts grid */}
            <div className="grid gap-6 lg:grid-cols-5 print-charts-grid">
                <div className="lg:col-span-3">
                    <RevenueChart data={data.chartData} />
                </div>
                <div className="lg:col-span-2">
                    <TopMenus menus={data.topMenus} />
                </div>
            </div>

            {/* Print-only Detailed Report */}
            <DetailedReport allMenuSales={data.allMenuSales} />
        </div>
    )
}

function AnalyticsLoadingSkeleton() {
    return (
        <div className="space-y-8 pb-10 animate-pulse">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-3 flex-1">
                    <Skeleton className="h-10 w-64 bg-zinc-800" />
                    <Skeleton className="h-4 w-96 bg-zinc-800/30" />
                </div>
                <Skeleton className="h-12 w-44 rounded-xl bg-zinc-800/50" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-3xl bg-zinc-900/40 border border-white/5" />
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-5">
                <Skeleton className="lg:col-span-3 h-[500px] rounded-3xl bg-zinc-900/40 border border-white/5" />
                <Skeleton className="lg:col-span-2 h-[500px] rounded-3xl bg-zinc-900/40 border border-white/5" />
            </div>
        </div>
    )
}

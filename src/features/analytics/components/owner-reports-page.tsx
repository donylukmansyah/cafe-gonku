"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { BarChart3, ReceiptText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateFilter } from "@/features/analytics/components/date-filter";
import { DetailedReport } from "@/features/analytics/components/detailed-report";
import { PaidTransactionsTable } from "@/features/analytics/components/paid-transactions-table";
import { PdfExportButton } from "@/features/analytics/components/pdf-export-button";
import { StatsCards } from "@/features/analytics/components/stats-cards";
import { TopMenus } from "@/features/analytics/components/top-menus";
import { useOwnerAnalytics } from "@/features/analytics/hooks/use-owner-analytics";
import "@/features/analytics/components/print-styles.css";

const RevenueChart = dynamic(
    () => import("@/features/analytics/components/revenue-chart").then((module) => module.RevenueChart),
    {
        ssr: false,
        loading: () => <Skeleton className="h-[500px] w-full rounded-2xl bg-zinc-900/40" />,
    },
);

export type OwnerReportTab = "laporan" | "riwayat";

export function OwnerReportsPage({ initialTab }: { initialTab: OwnerReportTab }) {
    const router = useRouter();
    const activeTab = initialTab;
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
        periodLabel,
    } = useOwnerAnalytics();

    const changeTab = (value: string) => {
        const nextTab: OwnerReportTab = value === "riwayat" ? "riwayat" : "laporan";
        router.replace(`/owner/laporan-transaksi?tab=${nextTab}`, { scroll: false });
    };

    if (isLoading) {
        return <OwnerReportsLoadingSkeleton />;
    }

    return (
        <div className="space-y-6 pb-6 print-container">
            {activeTab === "laporan" ? (
                <div className="print-header">
                    <div className="print-title-bar">
                        <div>
                            <h1 className="print-title">Cafe Gonku</h1>
                            <p className="print-subtitle">Laporan Pendapatan</p>
                        </div>
                        <div className="print-meta">
                            <span className="print-period-badge">{periodLabel}</span>
                            <p className="print-timestamp">Dicetak: {new Date().toLocaleString("id-ID")}</p>
                        </div>
                    </div>

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
            ) : null}

            <header className="border-b border-white/5 pb-5 hide-on-print">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Laporan dan Riwayat Transaksi
                </h1>
                <p className="mt-2 max-w-xl text-zinc-400">
                    Pantau pendapatan, menu terjual, dan transaksi yang sudah dibayar.
                </p>
            </header>

            <Tabs value={activeTab} onValueChange={changeTab} className="gap-6">
                <div className="flex flex-col gap-4 hide-on-print lg:flex-row lg:items-center lg:justify-between">
                    <TabsList className="h-auto w-full justify-start gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 sm:w-fit">
                        <TabsTrigger
                            value="laporan"
                            className="h-10 flex-1 gap-2 px-5 font-semibold text-zinc-400 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-black sm:flex-none"
                        >
                            <BarChart3 className="size-4" />
                            Laporan
                        </TabsTrigger>
                        <TabsTrigger
                            value="riwayat"
                            className="h-10 flex-1 gap-2 px-5 font-semibold text-zinc-400 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-black sm:flex-none"
                        >
                            <ReceiptText className="size-4" />
                            Riwayat Transaksi
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                        {activeTab === "laporan" ? <PdfExportButton /> : null}
                    </div>
                </div>

                <TabsContent value="laporan" className="mt-0 space-y-6">
                    <div className="hide-on-print">
                        <StatsCards
                            totalRevenue={data.totalRevenue}
                            onlineRevenue={data.onlineRevenue}
                            cashRevenue={data.cashRevenue}
                            totalOrders={data.totalOrders}
                            periodLabel={periodLabel}
                        />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-5 print-charts-grid">
                        <div className="lg:col-span-3">
                            <RevenueChart data={data.chartData} />
                        </div>
                        <div className="lg:col-span-2">
                            <TopMenus menus={data.topMenus} />
                        </div>
                    </div>

                    <DetailedReport allMenuSales={data.allMenuSales} />
                </TabsContent>

                <TabsContent value="riwayat" className="mt-0">
                    <PaidTransactionsTable transactions={data.paidTransactions} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function OwnerReportsLoadingSkeleton() {
    return (
        <div className="space-y-6 pb-10 animate-pulse">
            <div className="space-y-3 border-b border-white/5 pb-5">
                <Skeleton className="h-10 w-80 max-w-full bg-zinc-800" />
                <Skeleton className="h-4 w-96 max-w-full bg-zinc-800/40" />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                <Skeleton className="h-12 w-full rounded-xl bg-zinc-900 sm:w-72" />
                <Skeleton className="h-10 w-full rounded-xl bg-zinc-900 sm:w-48" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-40 rounded-2xl bg-zinc-900/40" />
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-5">
                <Skeleton className="h-[500px] rounded-2xl bg-zinc-900/40 lg:col-span-3" />
                <Skeleton className="h-[500px] rounded-2xl bg-zinc-900/40 lg:col-span-2" />
            </div>
        </div>
    );
}

"use client"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useAdminAnalytics } from "@/hooks/use-admin-analytics"

// Components (All memoized)
import { StatsCards } from "@/components/admin/analytics/stats-cards"
import { RevenueChart } from "@/components/admin/analytics/revenue-chart"
import { TopMenus } from "@/components/admin/analytics/top-menus"
import { Skeleton } from "@/components/ui/skeleton"

export default function AnalyticsPage() {
    const {
        data,
        isLoading,
        days,
        setDays,
    } = useAdminAnalytics();

    if (isLoading) {
        return <AnalyticsLoadingSkeleton />
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 border-b border-white/5 pb-4 relative">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                        Performance Analytics
                    </h1>
                    <p className="text-zinc-400 max-w-md mx-auto sm:mx-0">
                        Monitoring laporan pendapatan dan tren menu paling populer di Cafe Gonku secara real-time.
                    </p>
                </div>
                <div className="w-full sm:w-auto">
                    <Select value={days} onValueChange={setDays}>
                        <SelectTrigger className="h-10 w-full sm:w-40 bg-zinc-900/50 border-white/10 rounded-xl focus:ring-primary/20 hover:bg-zinc-800/80 transition-all font-bold text-zinc-300 text-xs cursor-pointer">
                            <SelectValue placeholder="Pilih periode" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 rounded-xl">
                            <SelectItem value="7" className="rounded-lg text-xs focus:bg-primary/20 focus:text-primary">7 Hari Terakhir</SelectItem>
                            <SelectItem value="14" className="rounded-lg text-xs focus:bg-primary/20 focus:text-primary">14 Hari Terakhir</SelectItem>
                            <SelectItem value="30" className="rounded-lg text-xs focus:bg-primary/20 focus:text-primary">30 Hari Terakhir</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <StatsCards
                totalRevenue={data.totalRevenue}
                totalOrders={data.totalOrders}
                days={days}
            />

            <div className="grid gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <RevenueChart data={data.chartData} />
                </div>
                <div className="lg:col-span-2">
                    <TopMenus menus={data.topMenus} />
                </div>
            </div>
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

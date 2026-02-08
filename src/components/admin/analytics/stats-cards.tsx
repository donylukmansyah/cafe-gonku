"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, ShoppingBag, Utensils } from "lucide-react"

interface StatsCardsProps {
    totalRevenue: number
    totalOrders: number
    days: string
}

export function StatsCards({ totalRevenue, totalOrders, days }: StatsCardsProps) {
    const averageOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-zinc-900/40 backdrop-blur-md border-white/5 shadow-2xl relative overflow-hidden group hover:border-primary/20 transition-all duration-500 cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Total Pendapatan
                    </CardTitle>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10 pt-2">
                    <div className="text-3xl font-black text-white tracking-tight">
                        <span className="text-emerald-500 mr-1">Rp</span>
                        {totalRevenue.toLocaleString("id-ID")}
                    </div>
                    <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mt-2 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-emerald-500/40" />
                        Dalam {days} hari terakhir
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/40 backdrop-blur-md border-white/5 shadow-2xl relative overflow-hidden group hover:border-blue-500/20 transition-all duration-500 cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-colors" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Total Order
                    </CardTitle>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-4 h-4 text-blue-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10 pt-2">
                    <div className="text-3xl font-black text-white tracking-tight">
                        {totalOrders}
                        <span className="text-blue-400 ml-1.5 text-lg font-bold">Orders</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mt-2 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-blue-500/40" />
                        Transaksi Berhasil
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/40 backdrop-blur-md border-white/5 shadow-2xl relative overflow-hidden group hover:border-orange-500/20 transition-all duration-500 md:col-span-2 lg:col-span-1 cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-orange-500/10 transition-colors" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Rata-rata Order
                    </CardTitle>
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 group-hover:scale-110 transition-transform">
                        <Utensils className="w-4 h-4 text-orange-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10 pt-2">
                    <div className="text-3xl font-black text-white tracking-tight">
                        <span className="text-orange-400 mr-1">Rp</span>
                        {averageOrder.toLocaleString("id-ID")}
                    </div>
                    <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mt-2 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-orange-500/40" />
                        Nilai per transaksi
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

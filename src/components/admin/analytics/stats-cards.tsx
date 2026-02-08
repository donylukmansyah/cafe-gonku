"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, ShoppingBag, CalendarRange } from "lucide-react";

interface StatsCardsProps {
    totalRevenue: number;
    totalOrders: number;
    days: string;
}

export const StatsCards = memo(function StatsCards({ totalRevenue, totalOrders, days }: StatsCardsProps) {
    const cards = [
        {
            title: "Gross Revenue",
            value: `Rp ${totalRevenue.toLocaleString("id-ID")}`,
            description: `Total pendapatan kotor (${days} hari)`,
            icon: TrendingUp,
            color: "text-emerald-400",
            bgColor: "bg-emerald-500/10",
        },
        {
            title: "Total Orders",
            value: totalOrders,
            description: `Jumlah pesanan lunas (${days} hari)`,
            icon: ShoppingBag,
            color: "text-primary",
            bgColor: "bg-primary/10",
        },
        {
            title: "Average Check",
            value: `Rp ${totalOrders > 0 ? (totalRevenue / totalOrders).toLocaleString("id-ID", { maximumFractionDigits: 0 }) : 0}`,
            description: "Rata-rata pengeluaran per order",
            icon: CalendarRange,
            color: "text-blue-400",
            bgColor: "bg-blue-500/10",
        },
    ];

    return (
        <div className="grid gap-6 md:grid-cols-3">
            {cards.map((card) => (
                <Card key={card.title} className="bg-zinc-900/50 border-white/5 overflow-hidden relative group backdrop-blur-sm">
                    <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500 ${card.color}`}>
                        <card.icon className="w-16 h-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center mb-2`}>
                            <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{card.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white tracking-tighter">{card.value}</div>
                        <CardDescription className="text-zinc-500 font-medium mt-1">
                            {card.description}
                        </CardDescription>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
});

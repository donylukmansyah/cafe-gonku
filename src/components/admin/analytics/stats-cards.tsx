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
                <div key={card.title} className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 relative overflow-hidden group backdrop-blur-sm hover:border-white/10 transition-all">
                    <div className={`absolute -right-6 -top-6 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-500 transform group-hover:rotate-12`}>
                        <card.icon className={`w-32 h-32 ${card.color.replace('text-', 'stroke-')}`} />
                    </div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-2xl ${card.bgColor} ${card.color}`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            {card.title === "Total Orders" && (
                                <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 text-zinc-400 px-2 py-1 rounded-lg border border-white/5">
                                    {days} Hari
                                </span>
                            )}
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">{card.title}</h3>
                            <div className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-2">
                                {card.value}
                            </div>
                            <p className="text-xs font-medium text-zinc-500 leading-relaxed max-w-[80%]">
                                {card.description}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, CheckCircle2 } from "lucide-react";

interface KitchenStatsBarProps {
    paidCount: number;
    preparingCount: number;
    readyCount: number;
    lastUpdated?: Date;
}

export const KitchenStatsBar = memo(function KitchenStatsBar({
    paidCount,
    preparingCount,
    readyCount,
    lastUpdated,
}: KitchenStatsBarProps) {
    const stats = [
        {
            label: "Menunggu",
            count: paidCount,
            icon: Clock,
            dotColor: "bg-amber-400",
            badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        },
        {
            label: "Dimasak",
            count: preparingCount,
            icon: ChefHat,
            dotColor: "bg-blue-400",
            badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        },
        {
            label: "Siap Antar",
            count: readyCount,
            icon: CheckCircle2,
            dotColor: "bg-primary",
            badgeClass: "bg-primary/20 text-primary border-primary/30",
        },
    ];

    return (
        <div className="px-6 py-3 bg-zinc-900/50 border-b border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-lg border border-zinc-800"
                    >
                        <div className={`w-2 h-2 rounded-full ${stat.dotColor}`} />
                        <stat.icon className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-sm font-medium text-zinc-400">{stat.label}</span>
                        <Badge className={`${stat.badgeClass} border font-bold px-2 text-xs`}>
                            {stat.count}
                        </Badge>
                    </div>
                ))}
            </div>

            {lastUpdated && (
                <div className="text-[10px] text-zinc-600 font-mono flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                    Data synced at {lastUpdated.toLocaleTimeString("id-ID")}
                </div>
            )}
        </div>
    );
});

"use client";

import { memo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Clock,
    ChefHat,
    CheckCircle2,
    Truck,
    MessageSquare,
    Timer,
} from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { Order } from "@/hooks/use-kitchen-orders";

interface OrderCardProps {
    order: Order;
    onStatusChange: (orderId: string, newStatus: string) => Promise<boolean>;
    isUpdating: boolean;
}

const statusConfig = {
    PAID: {
        label: "Menunggu",
        badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        icon: Clock,
        nextStatus: "PREPARING",
        nextLabel: "Mulai Masak",
        nextIcon: ChefHat,
    },
    PREPARING: {
        label: "Dimasak",
        badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        icon: ChefHat,
        nextStatus: "READY",
        nextLabel: "Selesai Masak",
        nextIcon: CheckCircle2,
    },
    READY: {
        label: "Siap Antar",
        badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        icon: CheckCircle2,
        nextStatus: "SERVED",
        nextLabel: "Antar ke Meja",
        nextIcon: Truck,
    },
    SERVED: {
        label: "Selesai",
        badgeClass: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
        icon: Truck,
        nextStatus: null,
        nextLabel: null,
        nextIcon: null,
    },
};

// Memoized OrderCard to prevent re-render unless order ID or status changes
export const OrderCard = memo(function OrderCard({ order, onStatusChange, isUpdating }: OrderCardProps) {
    const [localUpdating, setLocalUpdating] = useState(false);
    const [, setTick] = useState(0); // Force re-render every minute for timer

    const config = statusConfig[order.status];
    const StatusIcon = config.icon;

    // Update timer every minute
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    const waitTime = formatDistanceToNow(new Date(order.paidAt), {
        addSuffix: false,
        locale: localeId,
    });

    const waitMinutes = differenceInMinutes(new Date(), new Date(order.paidAt));

    // Urgency Logic
    const isUrgent = waitMinutes >= 10;
    const isWarning = waitMinutes >= 5 && waitMinutes < 10;

    const timerColor = isUrgent
        ? "text-red-400"
        : isWarning
            ? "text-amber-400"
            : "text-emerald-400";

    const handleStatusChange = async () => {
        if (!config.nextStatus || localUpdating) return;
        setLocalUpdating(true);
        try {
            await onStatusChange(order.id, config.nextStatus);
        } finally {
            setLocalUpdating(false);
        }
    };

    return (
        <Card
            className={`bg-zinc-900 border-zinc-800 overflow-hidden transition-all duration-200 hover:border-zinc-700 ${isUrgent ? "ring-2 ring-red-500/50" : isWarning ? "ring-1 ring-amber-500/30" : ""
                }`}
        >
            <div className={`h-1 ${isUrgent ? "bg-red-500 animate-pulse" : isWarning ? "bg-amber-500" : "bg-primary"}`} />
            <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${isUrgent
                            ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-105"
                            : isWarning
                                ? "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                : "bg-primary shadow-[0_0_15px_rgba(46,254,60,0.2)]"
                            }`}>
                            <span className="text-black font-black text-lg">
                                {order.table.tableNumber}
                            </span>
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base">
                                {order.orderCode}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Timer className={`w-3.5 h-3.5 ${timerColor} ${isUrgent ? "animate-pulse" : ""}`} />
                                <span className={`text-sm font-bold ${timerColor}`}>
                                    {waitTime}
                                </span>
                                {isUrgent && (
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-[10px] px-1.5 animate-pulse uppercase">
                                        Urgent
                                    </Badge>
                                )}
                                {isWarning && (
                                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 border text-[10px] px-1.5 uppercase">
                                        Warning
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <Badge className={`${config.badgeClass} border flex items-center gap-1.5 px-2.5 py-1 shrink-0`}>
                        <StatusIcon className="w-3 h-3" />
                        <span className="font-bold text-xs">{config.label}</span>
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-hidden">
                    {order.orderItems.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-800"
                        >
                            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                                <span className="text-primary font-bold text-sm">{item.quantity}x</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-semibold text-white text-sm block truncate">
                                    {item.menu.name}
                                </span>
                                {item.selectedOptions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {item.selectedOptions.map((opt) => (
                                            <span
                                                key={opt.id}
                                                className="text-[10px] px-1.5 py-0.5 bg-zinc-700/50 text-zinc-400 rounded"
                                            >
                                                {opt.optionValue}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {item.notes && (
                                    <div className="flex items-start gap-1.5 mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                                        <MessageSquare className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                                        <span className="text-xs text-amber-400 leading-relaxed">
                                            {item.notes}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {config.nextStatus && config.nextLabel && (
                    <Button
                        onClick={handleStatusChange}
                        disabled={isUpdating || localUpdating}
                        className="w-full h-11 bg-primary hover:bg-primary/90 text-black font-bold cursor-pointer"
                    >
                        {config.nextIcon && <config.nextIcon className="w-4 h-4 mr-2" />}
                        {localUpdating ? "Memproses..." : config.nextLabel}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}, (prev, next) => {
    // Deep comparison of order status and updating state
    return (
        prev.order.status === next.order.status &&
        prev.isUpdating === next.isUpdating &&
        prev.order.orderCode === next.order.orderCode &&
        prev.order.paidAt === next.order.paidAt &&
        prev.order.orderItems.length === next.order.orderItems.length
    );
});

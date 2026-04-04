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
    Loader2
} from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { Order } from "@/hooks/use-kitchen-orders";

interface OrderCardProps {
    order: Order;
    onStatusChange: (orderId: string, newStatus: string) => Promise<boolean>;
    isUpdating: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
}

const statusConfig = {
    PAID: {
        label: "Menunggu",
        badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        icon: Clock,
        nextStatus: "PREPARING",
        nextLabel: "Mulai Masak",
        nextIcon: ChefHat,
        buttonClass: "bg-orange-500 hover:bg-orange-600 text-white border-orange-600/50 shadow-orange-500/20",
    },
    PREPARING: {
        label: "Dimasak",
        badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        icon: ChefHat,
        nextStatus: "READY",
        nextLabel: "Selesai Masak",
        nextIcon: CheckCircle2,
        buttonClass: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600/50 shadow-blue-500/20",
    },
    READY: {
        label: "Siap Antar",
        badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        icon: CheckCircle2,
        nextStatus: "SERVED",
        nextLabel: "Antar ke Meja",
        nextIcon: Truck,
        buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600/50 shadow-emerald-500/20",
    },
    SERVED: {
        label: "Selesai",
        badgeClass: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
        icon: Truck,
        nextStatus: null,
        nextLabel: null,
        nextIcon: null,
        buttonClass: null,
    },
    CANCELLED: {
        label: "Dibatalkan",
        badgeClass: "bg-red-500/20 text-red-400 border-red-500/30",
        icon: Timer,
        nextStatus: null,
        nextLabel: "Pesanan Batal",
        nextIcon: null,
        buttonClass: "bg-zinc-900/50 text-red-900 border-zinc-800 cursor-not-allowed",
    },
};

// Memoized OrderCard to prevent re-render unless order ID or status changes
export const OrderCard = memo(function OrderCard({
    order,
    onStatusChange,
    isUpdating,
    isSelected,
    onSelect
}: OrderCardProps) {
    const [localUpdating, setLocalUpdating] = useState(false);
    const [, setTick] = useState(0); // Force re-render every minute for timer

    // DEFENSIVE CODING: Fallback to PAID if status is unknown to prevent crash
    const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PAID;
    const StatusIcon = config.icon || Clock;

    // Update timer every minute
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    const parseSafeDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    };

    const orderTime = parseSafeDate(order.paidAt) || parseSafeDate(order.createdAt) || new Date();

    const waitTime = formatDistanceToNow(orderTime, {
        addSuffix: false,
        locale: localeId,
    });

    const waitMinutes = differenceInMinutes(new Date(), orderTime);

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
            onClick={onSelect}
            className={`bg-zinc-950/60 backdrop-blur-2xl border-zinc-800/80 overflow-hidden transition-all duration-500 hover:border-primary/30 group cursor-pointer relative ${isSelected
                ? "ring-2 ring-primary shadow-[0_20px_50px_rgba(46,254,60,0.2)] border-primary/50"
                : isUrgent
                    ? "ring-2 ring-red-500/40 shadow-[0_20px_50px_rgba(239,68,68,0.2)]"
                    : isWarning
                        ? "ring-1 ring-amber-500/30 shadow-[0_15px_40px_rgba(245,158,11,0.1)]"
                        : "shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                }`}
        >
            {/* Selection Checkbox Overlay */}
            <div className={`absolute top-4 right-4 z-20 transition-all duration-300 ${isSelected ? "scale-100 opacity-100" : "scale-50 opacity-0 group-hover:opacity-50 group-hover:scale-90"}`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? "bg-primary border-primary text-black" : "border-zinc-500 text-transparent"}`}>
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                </div>
            </div>

            <div className={`h-1.5 w-full transition-all duration-500 ${isSelected ? "bg-primary animate-pulse" : isUrgent ? "bg-red-500 animate-pulse" : isWarning ? "bg-amber-500" : "bg-primary"
                }`} />

            <CardHeader className="p-5 pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 relative overflow-hidden group-hover:scale-110 group-hover:rotate-3 ${isUrgent
                            ? "bg-red-500 shadow-[0_8px_25px_rgba(239,68,68,0.4)]"
                            : isWarning
                                ? "bg-amber-500 shadow-[0_8px_25px_rgba(245,158,11,0.3)]"
                                : "bg-primary shadow-[0_10px_30px_rgba(46,254,60,0.15)]"
                            }`}>
                            {/* Glossy Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-60" />
                            <span className="text-black font-black text-2xl tracking-tighter relative z-10 italic">
                                {order.table.tableNumber}
                            </span>
                        </div>

                        <div className="space-y-1">
                            <h3 className="font-black text-white text-lg tracking-tight leading-none">
                                {order.orderCode}
                            </h3>
                            <div className="flex items-center gap-2">
                                <Timer className={`w-3.5 h-3.5 ${timerColor} ${isUrgent ? "animate-pulse" : ""}`} />
                                <span className={`text-[13px] font-black tracking-widest uppercase ${timerColor}`}>
                                    {waitTime}
                                </span>
                                {isUrgent && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <Badge className={`${config.badgeClass} border-none font-black text-[10px] px-3 py-1 uppercase tracking-tighter shadow-inner`}>
                            <StatusIcon className="w-3 h-3 mr-1.5" />
                            {config.label}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-5 pb-5 space-y-4">
                <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {order.orderItems.map((item) => (
                        <div
                            key={item.id}
                            className="group/item flex items-start gap-3.5 p-3.5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors rounded-xl border border-zinc-800/50"
                        >
                            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 border border-primary/20 group-hover/item:bg-primary/20 transition-all">
                                <span className="text-primary font-black text-sm">{item.quantity}x</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-extrabold text-zinc-100 text-[16px] block group-hover/item:text-primary transition-colors tracking-tight">
                                    {item.menu.name}
                                </span>

                                {item.selectedOptions.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {item.selectedOptions.map((opt) => (
                                            <span
                                                key={opt.id}
                                                className="text-[10px] px-2 py-0.5 bg-zinc-800 border border-zinc-700/50 text-zinc-400 font-medium rounded-md"
                                            >
                                                {opt.optionName}: {opt.optionValue}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {item.notes && (
                                    <div className="flex items-start gap-2 mt-3 p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-lg group-hover/item:bg-amber-500/10 transition-colors">
                                        <MessageSquare className="w-3.5 h-3.5 text-amber-500/60 mt-0.5 shrink-0" />
                                        <p className="text-xs text-amber-500/80 font-medium italic italic-leading-tight">
                                            &quot;{item.notes}&quot;
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {config.nextStatus && config.nextLabel && (
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange();
                        }}
                        disabled={isUpdating || localUpdating}
                        className={`w-full h-12 font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl mt-2 overflow-hidden relative group/btn border shadow-lg ${config.buttonClass || "bg-primary text-black"}`}
                    >
                        {localUpdating ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                                {config.nextIcon && <config.nextIcon className="w-5 h-5 mr-3 stroke-[2.5] relative z-10" />}
                                <span className="relative z-10">{config.nextLabel}</span>
                            </>
                        )}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}, (prev, next) => {
    // Deep comparison of order status and updating state
    return (
        prev.isSelected === next.isSelected &&
        prev.order.status === next.order.status &&
        prev.isUpdating === next.isUpdating &&
        prev.order.orderCode === next.order.orderCode &&
        prev.order.paidAt === next.order.paidAt &&
        prev.order.orderItems.length === next.order.orderItems.length
    );
});

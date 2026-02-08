"use client";

import { memo } from "react";
import { Order } from "@/hooks/use-kitchen-orders";
import { OrderCard } from "./order-card";
import { ChefHat, Loader2 } from "lucide-react";

interface OrderQueueProps {
    orders: Order[];
    isLoading: boolean;
    isUpdating: boolean;
    onStatusChange: (orderId: string, newStatus: string) => Promise<boolean>;
}

// Memoized OrderQueue
export const OrderQueue = memo(function OrderQueue({
    orders,
    isLoading,
    isUpdating,
    onStatusChange,
}: OrderQueueProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                    <p className="text-zinc-500 font-medium">Memuat order...</p>
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="text-center max-w-md">
                    <div className="w-24 h-24 bg-zinc-900/80 border border-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                        <ChefHat className="w-12 h-12 text-zinc-700" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">
                        Belum Ada Order
                    </h2>
                    <p className="text-zinc-500 font-medium leading-relaxed">
                        Order baru akan muncul secara otomatis secara real-time.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-600">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Sistem Standby. Mendeteksi order baru...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {orders.map((order) => (
                <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={onStatusChange}
                    isUpdating={isUpdating}
                />
            ))}
        </div>
    );
});

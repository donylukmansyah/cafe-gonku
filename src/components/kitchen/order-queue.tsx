"use client";

import { memo } from "react";
import { Order } from "@/hooks/use-kitchen-orders";
import { OrderCard } from "./order-card";
import { ChefHat, Loader2, Play, CheckCircle2, Truck } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface OrderQueueProps {
    orders: Order[];
    isLoading: boolean;
    isUpdating: boolean;
    onStatusChange: (orderId: string | string[], newStatus: string) => Promise<boolean>;
}

// Memoized OrderQueue
export const OrderQueue = memo(function OrderQueue({
    orders,
    isLoading,
    isUpdating,
    onStatusChange,
}: OrderQueueProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
    const firstStatus = selectedOrders[0]?.status;
    const isSameStatus = selectedOrders.every(o => o.status === firstStatus);

    const bulkActionConfig = {
        PAID: {
            label: "MULAI MASAK",
            nextStatus: "PREPARING",
            icon: Play,
            successMsg: "pesanan mulai dimasak! 🍳"
        },
        PREPARING: {
            label: "SELESAI MASAK",
            nextStatus: "READY",
            icon: CheckCircle2,
            successMsg: "pesanan selesai dimasak! ✅"
        },
        READY: {
            label: "ANTAR KE MEJA",
            nextStatus: "SERVED",
            icon: Truck,
            successMsg: "pesanan dalam pengantaran! 🚚"
        }
    };

    const currentBulkAction = firstStatus ? bulkActionConfig[firstStatus as keyof typeof bulkActionConfig] : null;

    const handleBulkAction = async () => {
        if (selectedIds.length === 0 || !currentBulkAction || !isSameStatus) return;

        try {
            await onStatusChange(selectedIds, currentBulkAction.nextStatus);
            setSelectedIds([]);
            toast.success(`${selectedIds.length} ${currentBulkAction.successMsg}`);
        } catch {
            toast.error("Gagal memperbarui pesanan masal");
        }
    };

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
        <div className="space-y-6">
            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="sticky top-0 z-50 py-4 -mt-2">
                    <div className="bg-zinc-950/80 backdrop-blur-xl border border-primary/30 rounded-2xl p-4 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                                {selectedIds.length > 0 && (
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center border-4 border-zinc-950 text-black font-black text-sm">
                                        {selectedIds.length}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-black text-sm leading-none">Terpilih</span>
                                <span className="text-zinc-500 font-bold text-[11px] uppercase tracking-wider">
                                    {isSameStatus ? "Aksi Masal" : "Status Berbeda"}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {!isSameStatus ? (
                                <span className="text-red-400 font-bold text-xs bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 shadow-inner">
                                    Pilih status yang sama untuk aksi masal
                                </span>
                            ) : null}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds([])}
                                className="text-zinc-400 hover:text-white font-bold"
                            >
                                Batal
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleBulkAction}
                                disabled={isUpdating || !isSameStatus || !currentBulkAction}
                                className="bg-primary text-black hover:bg-primary/90 font-black rounded-xl px-6 h-10 shadow-lg shadow-primary/20 disabled:opacity-30"
                            >
                                {isUpdating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        {currentBulkAction?.icon && <currentBulkAction.icon className="w-4 h-4 mr-2 fill-current" />}
                                        {isSameStatus && currentBulkAction ? currentBulkAction.label : "AKSI MASAL"} ({selectedIds.length})
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.map((order) => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={onStatusChange}
                        isUpdating={isUpdating}
                        isSelected={selectedIds.includes(order.id)}
                        onSelect={() => toggleSelect(order.id)}
                    />
                ))}
            </div>
        </div>
    );
});

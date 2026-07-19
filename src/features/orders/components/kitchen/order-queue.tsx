"use client";

import { memo } from "react";
import { Order } from "@/features/orders/hooks/use-kitchen-orders";
import { OrderCard } from "./order-card";
import {
    ChefHat,
    Loader2,
    Play,
    CheckCircle2,
    Truck,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface OrderQueueProps {
    orders: Order[];
    isLoading: boolean;
    isUpdating: boolean;
    onStatusChange: (orderId: string | string[], newStatus: string) => Promise<boolean>;
    showHistory?: boolean;
}

const ITEMS_PER_PAGE = 6;

// Memoized OrderQueue
export const OrderQueue = memo(function OrderQueue({
    orders,
    isLoading,
    isUpdating,
    onStatusChange,
    showHistory = false,
}: OrderQueueProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

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

    // Client-side pagination logic
    const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
    const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));
    const paginatedOrders = showHistory
        ? orders.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE)
        : orders;

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl overflow-hidden p-5 space-y-4"
                        >
                            {/* Card top-bar indicator */}
                            <div className="h-1.5 w-full bg-zinc-900 rounded-full" />

                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    {/* Table circle */}
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 shrink-0" />
                                    <div className="space-y-2">
                                        {/* Order code */}
                                        <div className="h-5 w-24 bg-zinc-900 rounded" />
                                        {/* Wait time */}
                                        <div className="h-3.5 w-20 bg-zinc-900 rounded" />
                                    </div>
                                </div>
                                {/* Badge */}
                                <div className="h-6 w-20 bg-zinc-900 rounded-full" />
                            </div>

                            {/* Order items */}
                            <div className="space-y-2.5">
                                {[1, 2].map((j) => (
                                    <div
                                        key={j}
                                        className="flex items-start gap-3.5 p-3.5 bg-zinc-900/20 rounded-xl border border-zinc-900/50"
                                    >
                                        {/* Quantity */}
                                        <div className="w-9 h-9 bg-zinc-900 rounded-lg shrink-0" />
                                        {/* Item details */}
                                        <div className="flex-1 space-y-2 py-1">
                                            <div className="h-4 w-3/4 bg-zinc-900 rounded" />
                                            <div className="h-3 w-1/2 bg-zinc-900 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Button */}
                            <div className="h-12 w-full bg-zinc-900 rounded-xl mt-2" />
                        </div>
                    ))}
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
                {paginatedOrders.map((order) => (
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

            {/* Reusable Interactive Pagination */}
            {showHistory && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950/40 border border-zinc-800/80 p-4 rounded-2xl animate-in fade-in duration-300">
                    <span className="text-zinc-500 font-bold text-xs uppercase tracking-wider">
                        Menampilkan {paginatedOrders.length} dari {orders.length} pesanan
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePageChange(1)}
                            disabled={safeCurrentPage === 1}
                            className="w-9 h-9 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all disabled:opacity-30"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePageChange(safeCurrentPage - 1)}
                            disabled={safeCurrentPage === 1}
                            className="w-9 h-9 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all disabled:opacity-30"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        {/* Page Numbers */}
                        {Array.from({ length: totalPages }).map((_, idx) => {
                            const p = idx + 1;
                            const isCurrent = p === safeCurrentPage;
                            // Only show neighbors
                            if (totalPages > 5 && Math.abs(p - safeCurrentPage) > 1 && p !== 1 && p !== totalPages) {
                                if (p === 2 || p === totalPages - 1) {
                                    return <span key={p} className="text-zinc-700 font-bold text-sm px-1">...</span>;
                                }
                                return null;
                            }
                            return (
                                <Button
                                    key={p}
                                    onClick={() => handlePageChange(p)}
                                    variant={isCurrent ? "default" : "outline"}
                                    className={`w-9 h-9 font-extrabold text-sm rounded-xl transition-all ${
                                        isCurrent
                                            ? "bg-primary text-black shadow-lg shadow-primary/20 hover:bg-primary/95"
                                            : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                                    }`}
                                >
                                    {p}
                                </Button>
                            );
                        })}

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePageChange(safeCurrentPage + 1)}
                            disabled={safeCurrentPage === totalPages}
                            className="w-9 h-9 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all disabled:opacity-30"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePageChange(totalPages)}
                            disabled={safeCurrentPage === totalPages}
                            className="w-9 h-9 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all disabled:opacity-30"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
});

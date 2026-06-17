"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, ChefHat, Truck, Utensils, XCircle, CheckCircle, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRealtimeOrder } from "@/hooks/use-realtime-order";
import { useDokuCheckout } from "@/hooks/use-doku-checkout";

// Order Status Types (Match Prisma Enum)
type OrderStatus = "PENDING" | "PAID" | "PREPARING" | "READY" | "SERVED" | "CANCELLED" | "EXPIRED";

const PAYMENT_EXPIRY_MINUTES = 60;

const STEPS = [
    { status: "PAID", label: "Menunggu Dapur", icon: Clock },
    { status: "PREPARING", label: "Dimasak", icon: ChefHat },
    { status: "READY", label: "Siap", icon: Truck },
    { status: "SERVED", label: "Selesai", icon: Utensils },
];

export function TrackingSheet() {
    const [isOpen, setIsOpen] = useState(false);
    const { order, refresh, activeOrderCode } = useRealtimeOrder();
    const { openDokuCheckout } = useDokuCheckout();
    const setActiveOrderCode = useCart((state) => state.setActiveOrderCode);
    const getOrderAccessToken = useCart((state) => state.getOrderAccessToken);
    const hasHydrated = useCart((state) => state.hasHydrated);
    const itemCount = useCart((state) => state.getItemCount());

    // Effect to handle Order Completion/Cancellation (Close sheet if finished)
    useEffect(() => {
        if (order?.status === "SERVED" || order?.status === "CANCELLED") {
            // Optional: Auto open/close logic or just toast
        }
    }, [order?.status]);

    useEffect(() => {
        if (isOpen) {
            refresh();
        }
    }, [isOpen, refresh]);

    const [isCancelling, setIsCancelling] = useState(false);

    const handlePayment = () => {
        const paymentUrl = order?.paymentRedirectUrl ?? order?.midtransToken;
        if (!paymentUrl) {
            toast.error("Gagal memulai pembayaran. Silakan buat pesanan baru.");
            return;
        }

        openDokuCheckout(paymentUrl);
    };

    const handleCancelOrder = async () => {
        if (!activeOrderCode) return;
        setIsCancelling(true);
        try {
            const token = getOrderAccessToken(activeOrderCode);
            const headers: Record<string, string> = {
                "Content-Type": "application/json"
            };
            if (token) {
                headers["x-order-token"] = token;
            }

            const res = await fetch(`/api/orders/${activeOrderCode}/cancel`, {
                method: "POST",
                headers
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal membatalkan");
            toast.success("Pesanan berhasil dibatalkan");
            setActiveOrderCode(null);
            setIsOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Gagal membatalkan pesanan");
        } finally {
            setIsCancelling(false);
        }
    };

    if (!hasHydrated || !activeOrderCode) return null;

    // Determine current step index
    const getCurrentStepIndex = (status: OrderStatus) => {
        switch (status) {
            case "PENDING": return 0;
            case "PAID": return 0;
            case "PREPARING": return 1;
            case "READY": return 2;
            case "SERVED": return 3;
            default: return -1;
        }
    };

    const currentStep = order ? getCurrentStepIndex(order.status) : 0;
    const paymentExpiresAt = order
        ? new Date(order.paymentExpiresAt ?? new Date(order.createdAt).getTime() + PAYMENT_EXPIRY_MINUTES * 60_000)
        : null;
    const isPaymentExpiredByTime = order?.paymentStatus === "PENDING" && paymentExpiresAt ? Date.now() > paymentExpiresAt.getTime() : false;
    const steps = order?.paymentStatus === "PENDING"
        ? [{ ...STEPS[0], status: "PENDING", label: "Belum Bayar" }, ...STEPS.slice(1)]
        : STEPS;
    const isCancelled = order?.status === "CANCELLED" || order?.status === "EXPIRED";

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <div className={cn(
                    "fixed left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 pointer-events-none transition-all duration-500 ease-in-out",
                    itemCount > 0 ? "bottom-24" : "bottom-6"
                )}>
                    <div className="flex justify-end">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="w-14 h-14 bg-zinc-900/90 text-primary border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-full backdrop-blur-xl pointer-events-auto hover:bg-zinc-800/95 hover:border-primary/40 ring-1 ring-white/5 active:scale-95 transition-all"
                        >
                            <Receipt className="w-6 h-6" />
                        </Button>
                    </div>
                </div>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[2rem] border-t border-x border-white/5 bg-zinc-950 p-0 flex flex-col shadow-2xl max-w-md mx-auto inset-x-0">
                <SheetDescription className="sr-only">
                    Status pembayaran dan progress pesanan aktif.
                </SheetDescription>
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                    <div className="w-10 h-1 bg-zinc-800 rounded-full" />
                </div>

                {/* Header Section */}
                <div className="px-6 pb-6 flex-none">
                    <SheetHeader className="text-left mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    Pesanan #{order?.orderCode?.slice(-4)}
                                </SheetTitle>
                                <p className="text-xs text-zinc-500 mt-0.5 font-medium">
                                    {order?.customerName || "Pelanggan"} • Meja {order?.table?.tableNumber || "-"}
                                </p>
                            </div>
                            {order && (
                                <div className="flex flex-col items-end gap-1">
                                    {order.paymentStatus === "PAID" ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1">
                                            LUNAS <CheckCircle className="w-3 h-3" />
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] px-2 py-0.5 rounded-lg animate-pulse">
                                            BELUM BAYAR
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
                    </SheetHeader>

                    {/* Stepper */}
                    {!isCancelled ? (
                        <div className="flex items-start px-2">
                            {steps.map((step, index) => {
                                const isActive = index <= currentStep;
                                const isCurrent = index === currentStep;
                                const isSegmentActive = index < currentStep;
                                const Icon = step.icon;

                                return (
                                    <div
                                        key={step.status}
                                        className={cn(
                                            "flex items-start",
                                            index < steps.length - 1 ? "flex-1" : "flex-none"
                                        )}
                                    >
                                        <div className="relative flex w-7 shrink-0 flex-col items-center group">
                                            <div className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-zinc-950 z-10",
                                                isActive
                                                    ? "border-primary text-primary bg-zinc-900 md:bg-zinc-950"
                                                    : "border-zinc-800 text-zinc-700",
                                                isCurrent && "ring-4 ring-primary/10 scale-110 shadow-[0_0_15px_rgba(53,183,24,0.2)]"
                                            )}>
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <span className={cn(
                                                "absolute left-1/2 top-9 w-16 -translate-x-1/2 text-[9px] font-bold text-center transition-all duration-300 uppercase tracking-tight leading-tight",
                                                isActive ? "text-zinc-300" : "text-zinc-700",
                                                isCurrent && "text-primary scale-105"
                                            )}>
                                                {step.label}
                                            </span>
                                        </div>

                                        {index < steps.length - 1 && (
                                            <div
                                                className={cn(
                                                    "mt-3.5 h-[2px] flex-1 rounded-full transition-all duration-700 ease-out",
                                                    isSegmentActive
                                                        ? "bg-primary shadow-[0_0_12px_rgba(53,183,24,0.4)]"
                                                        : "bg-transparent"
                                                )}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <XCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">Pesanan Dibatalkan</h3>
                                <p className="text-zinc-500 text-xs">Silakan hubungi pelayan jika ini kesalahan.</p>
                            </div>
                        </div>
                    )}
                </div>

                <Separator className="bg-zinc-900 border-zinc-900" />

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hidden">
                    {order ? (
                        <div className="space-y-6 pb-24"> {/* Added padding bottom for safe scroll */}
                            {order.paymentStatus === "PENDING" && (
                                <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-widest">
                                        <Clock className="w-4 h-4" />
                                        Menunggu Pembayaran
                                    </div>
                                    <p className="text-xs leading-relaxed text-zinc-400">
                                        Selesaikan pembayaran sebelum {paymentExpiresAt?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}. Jangan membayar setelah waktu habis.
                                    </p>
                                    <p className="text-[11px] leading-relaxed text-zinc-500">
                                        Jika pembayaran dilakukan setelah expired dan saldo terpotong, pesanan tidak otomatis diproses. Silakan hubungi kasir dengan kode order <span className="font-mono text-zinc-300">{order.orderCode}</span>.
                                    </p>
                                    {isPaymentExpiredByTime && (
                                        <div className="rounded-xl border border-red-500/15 bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-300">
                                            Waktu bayar kemungkinan sudah habis. Silakan buat pesanan baru atau hubungi kasir.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Menu Dipesan</h4>
                                {order.orderItems?.map((item) => (
                                    <div key={item.id} className="flex justify-between items-start py-1">
                                        <div className="flex-1 pr-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-6 h-6 bg-zinc-900 rounded-md flex items-center justify-center border border-zinc-800 shrink-0 mt-0.5">
                                                    <span className="text-primary font-bold text-[10px]">{item.quantity}x</span>
                                                </div>
                                                <div>
                                                    <p className="text-zinc-200 text-sm font-medium leading-tight">{item.menu.name}</p>
                                                    {item.selectedOptions.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                            {item.selectedOptions.map((o, i) => (
                                                                <span key={i} className="text-[9px] text-zinc-500 px-1.5 py-0.5 bg-zinc-900 rounded border border-zinc-800/50">{o.optionValue}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-zinc-400 text-sm font-semibold whitespace-nowrap">
                                            Rp {(
                                                (item.price + item.selectedOptions.reduce((sum, option) => sum + option.priceAdjust, 0)) *
                                                item.quantity
                                            ).toLocaleString("id-ID")}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-dashed border-zinc-800 pt-4 mt-4 space-y-2">
                                {(() => {
                                    const subtotal = order.orderItems?.reduce((acc, item) => {
                                        const optTotal = item.selectedOptions.reduce((s, o) => s + o.priceAdjust, 0);
                                        return acc + (item.price + optTotal) * item.quantity;
                                    }, 0) ?? 0;
                                    const serviceFee = Math.round(subtotal * 0.1);
                                    const rounding = order.totalAmount - subtotal - serviceFee;
                                    return (
                                        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-zinc-500 text-xs">Subtotal</span>
                                                <span className="text-zinc-400 text-xs font-bold tabular-nums">Rp {subtotal.toLocaleString("id-ID")}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-zinc-500 text-xs">Biaya Layanan & Aplikasi</span>
                                                <span className="text-zinc-400 text-xs font-bold tabular-nums">Rp {serviceFee.toLocaleString("id-ID")}</span>
                                            </div>
                                            {rounding !== 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-zinc-500 text-xs">Pembulatan</span>
                                                    <span className="text-zinc-400 text-xs font-bold tabular-nums">
                                                        {rounding > 0 ? "+" : "-"}Rp {Math.abs(rounding).toLocaleString("id-ID")}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="border-t border-zinc-800 pt-2 flex justify-between items-center">
                                                <span className="text-zinc-400 font-bold text-xs uppercase">Total Tagihan</span>
                                                <span className="text-xl font-black text-primary">
                                                    Rp {order.totalAmount.toLocaleString("id-ID")}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-50">
                            <Clock className="w-8 h-8 text-zinc-700 animate-pulse" />
                            <p className="text-zinc-600 text-xs font-medium">Memuat data order...</p>
                        </div>
                    )}
                </div>

                {/* Fixed Bottom Action Bar */}
                {(order?.status === "SERVED" || order?.status === "CANCELLED" || order?.status === "EXPIRED" || (order?.paymentStatus === "PENDING" && (order?.paymentRedirectUrl || order?.midtransToken))) && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-zinc-950 via-zinc-950 to-zinc-950/0 pt-12">
                        {/* CASE: Pending Payment */}
                        {order.paymentStatus === "PENDING" && order.status !== "CANCELLED" && order.status !== "EXPIRED" && (
                            <div className="space-y-3">
                                {isPaymentExpiredByTime && (
                                    <div className="rounded-xl border border-red-500/15 bg-red-500/10 px-4 py-3 text-[11px] leading-relaxed text-red-200">
                                        Waktu pembayaran sudah habis. Jangan lanjut bayar QR lama. Jika saldo sudah terpotong, hubungi kasir dengan kode order <span className="font-mono font-bold">{order.orderCode}</span>.
                                    </div>
                                )}
                                <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    disabled={isCancelling}
                                    onClick={handleCancelOrder}
                                    className="flex-1 h-12 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-xl font-bold text-xs uppercase tracking-wider"
                                >
                                    {isCancelling ? "..." : "Batal"}
                                </Button>
                                <Button
                                    onClick={handlePayment}
                                    disabled={isPaymentExpiredByTime}
                                    className="flex-[2] h-12 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isPaymentExpiredByTime ? "Waktu Habis" : "Bayar Sekarang"}
                                </Button>
                                </div>
                            </div>
                        )}

                        {/* CASE: Order Finished / Failed */}
                        {(order.status === "SERVED" || order.status === "CANCELLED" || order.status === "EXPIRED") && (
                            <Button
                                className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-widest bg-primary hover:bg-primary/90 text-black shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                onClick={() => {
                                    setActiveOrderCode(null);
                                    setIsOpen(false);
                                    toast.success("Silakan pesan lagi");
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            >
                                {order.status === "SERVED" ? "Pesan Menu Lain" : "Buat Pesanan Baru"}
                            </Button>
                        )}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

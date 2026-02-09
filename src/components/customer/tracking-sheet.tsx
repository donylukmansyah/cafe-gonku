"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ChefHat, Truck, Utensils, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSnap } from "@/hooks/use-snap";
import { useRealtimeOrder } from "@/hooks/use-realtime-order";

// Order Status Types (Match Prisma Enum)
type OrderStatus = "PENDING" | "PAID" | "PREPARING" | "READY" | "SERVED" | "CANCELLED" | "EXPIRED";

const STEPS = [
    { status: "PENDING", label: "Menunggu Konfirmasi", icon: Clock },
    { status: "PREPARING", label: "Sedang Disiapkan", icon: ChefHat },
    { status: "READY", label: "Siap Diantar", icon: Truck },
    { status: "SERVED", label: "Selesai", icon: Utensils },
];

export function TrackingSheet() {
    const [isOpen, setIsOpen] = useState(false);
    const { order, isLoading, refresh, activeOrderCode } = useRealtimeOrder();
    const { snapPay } = useSnap();
    const setActiveOrderCode = useCart((state) => state.setActiveOrderCode);

    // Effect to handle Order Completion/Cancellation (Close sheet if finished)
    useEffect(() => {
        if (order?.status === "SERVED" || order?.status === "CANCELLED") {
            // Optional: Auto open/close logic or just toast
        }
    }, [order?.status]);

    const [isCancelling, setIsCancelling] = useState(false);

    const handlePayment = () => {
        if (!order?.midtransToken) {
            toast.error("Gagal memulai pembayaran. Silakan buat pesanan baru.");
            return;
        }

        snapPay(order.midtransToken, {
            onSuccess: () => {
                toast.success("Pembayaran berhasil! ✨");
                refresh();
            },
            onPending: () => {
                toast.info("Pembayaran tertunda. Silakan selesaikan pembayaranmu.");
            },
            onError: () => {
                toast.error("Pembayaran gagal. Silakan coba lagi.");
            },
            onClose: () => {
                toast.info("Selesaikan pembayaranmu nanti di sini ya!");
            },
        });
    };

    const handleCancelOrder = async () => {
        if (!activeOrderCode) return;

        // Confirmation? Maybe just direct for now as per request "salah pencet"
        // But a confirm dialog is best practice. Let's use Sonner toast action for simplicity or just direct.
        // User asked "gimana ya kasus nya biar bisa ulang".

        setIsCancelling(true);
        try {
            const res = await fetch(`/api/orders/${activeOrderCode}/cancel`, {
                method: "POST"
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Gagal membatalkan");

            toast.success("Pesanan berhasil dibatalkan 👋");
            setActiveOrderCode(null); // Clear session
            setIsOpen(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsCancelling(false);
        }
    };

    if (!activeOrderCode) return null;

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
    const isCancelled = order?.status === "CANCELLED" || order?.status === "EXPIRED";

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="secondary"
                    size="sm"
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/90 text-white backdrop-blur-md border border-white/10 shadow-xl rounded-full px-6 py-6 animate-in slide-in-from-bottom-10 fade-in duration-500 hover:scale-105 active:scale-95 transition-all"
                >
                    <Clock className="w-4 h-4 mr-2 text-primary animate-pulse" />
                    Lacak Pesanan
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[2.5rem] border-t border-white/10 bg-zinc-950 p-0 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="p-6 pb-2 relative">
                    <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-8 shadow-inner" />
                    <SheetHeader className="text-left mb-8">
                        <SheetTitle className="text-2xl font-black text-white flex flex-col gap-1 tracking-tight">
                            <div className="flex items-center justify-between w-full">
                                <span className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" />
                                    Pesanan Kamu
                                </span>
                                {order && (
                                    <Badge variant="secondary" className="bg-zinc-900 text-zinc-400 border-white/5 font-mono px-3 py-1 rounded-xl text-[10px]">
                                        #{order.orderCode}
                                    </Badge>
                                )}
                            </div>
                            {order && (
                                <div className="flex items-center gap-2 mt-2">
                                    {order.paymentStatus === "PAID" ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg">
                                            LUNAS ✅
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg animate-pulse">
                                            MENUNGGU PEMBAYARAN ⏳
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </SheetTitle>
                    </SheetHeader>

                    {/* Stepper */}
                    {!isCancelled ? (
                        <div className="relative flex justify-between px-3 mb-10">
                            {/* Line Background */}
                            <div className="absolute top-4 left-6 right-6 h-0.5 bg-zinc-900 -z-10" />

                            {/* Progress Line */}
                            <div
                                className="absolute top-4 left-6 h-0.5 bg-primary -z-10 transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(46,254,60,0.5)]"
                                style={{ width: `${(currentStep / (STEPS.length - 1)) * 92}%` }}
                            />

                            {STEPS.map((step, index) => {
                                const isActive = index <= currentStep;
                                const isCurrent = index === currentStep;
                                const Icon = step.icon;

                                return (
                                    <div key={step.status} className="flex flex-col items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-zinc-950 shadow-inner",
                                            isActive
                                                ? "border-primary text-primary shadow-[0_0_15px_rgba(46,254,60,0.2)]"
                                                : "border-zinc-800 text-zinc-700",
                                            isCurrent && "ring-4 ring-primary/20 scale-125 z-10"
                                        )}>
                                            <Icon className={cn("w-4.5 h-4.5 transition-transform duration-500", isCurrent && "animate-pulse")} />
                                        </div>
                                        <span className={cn(
                                            "text-[11px] font-bold text-center max-w-[70px] leading-tight transition-all duration-500 uppercase tracking-tighter",
                                            isActive ? "text-white" : "text-zinc-600",
                                            isCurrent && "text-primary"
                                        )}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4 mb-8 animate-in fade-in zoom-in duration-300">
                            <XCircle className="w-10 h-10 text-red-500" />
                            <div>
                                <h3 className="text-white font-black text-lg">Pesanan Gagal</h3>
                                <p className="text-zinc-400 text-sm">Pesanan ini dibatalkan atau pembayaran expired.</p>
                            </div>
                        </div>
                    )}
                </div>

                <Separator className="bg-zinc-900" />

                {/* Order Details List */}
                <ScrollArea className="flex-1 px-6 py-8">
                    {order ? (
                        <div className="space-y-8">
                            <div className="space-y-5">
                                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">Rincian Item</h4>
                                {order.orderItems.map((item) => (
                                    <div key={item.id} className="flex justify-between items-start group">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 group-hover:border-primary/30 transition-colors">
                                                    <span className="text-primary font-black text-xs">{item.quantity}x</span>
                                                </div>
                                                <span className="text-zinc-100 text-[15px] font-bold tracking-tight">{item.menu.name}</span>
                                            </div>
                                            {item.selectedOptions.length > 0 && (
                                                <div className="flex flex-wrap gap-1 content-start pl-10">
                                                    {item.selectedOptions.map((o, i) => (
                                                        <span key={i} className="text-[10px] text-zinc-500 px-1.5 py-0.5 bg-zinc-900 rounded border border-zinc-800">{o.optionValue}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-zinc-300 text-sm font-bold pt-1">
                                            Rp {item.price.toLocaleString("id-ID")}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/5 shadow-inner">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400 font-bold text-sm uppercase tracking-tight">Total Pembayaran</span>
                                    <span className="text-2xl font-black text-primary drop-shadow-[0_0_10px_rgba(46,254,60,0.3)]">
                                        Rp {order.totalAmount.toLocaleString("id-ID")}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 pt-4">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sistem sinkronisasi real-time aktif</span>
                            </div>

                            {order.paymentStatus === "PENDING" && order.midtransToken && (
                                <div className="pt-4 px-1 space-y-3">
                                    <Button
                                        onClick={handlePayment}
                                        className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-black font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_8px_30px_rgba(245,158,11,0.3)] animate-bounce-subtle"
                                    >
                                        Bayar Sekarang 💳
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        disabled={isCancelling}
                                        onClick={handleCancelOrder}
                                        className="w-full h-10 text-red-500 hover:text-red-400 hover:bg-red-500/10 font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
                                    >
                                        {isCancelling ? "Membatalkan..." : "Batalkan Pesanan"}
                                    </Button>

                                    <p className="text-[10px] text-zinc-600 text-center mt-1 font-bold uppercase tracking-tight italic">
                                        Klik untuk lanjut ke pembayaran aman via Midtrans
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 space-y-4">
                            <div className="relative">
                                <Utensils className="w-10 h-10 text-zinc-800 animate-pulse" />
                                <div className="absolute inset-0 w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            </div>
                            <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Menyambungkan ke dapur...</p>
                        </div>
                    )}
                </ScrollArea>

                {order?.status === "SERVED" && (
                    <div className="p-8 border-t border-white/10 bg-zinc-900/40 backdrop-blur-xl">
                        <Button
                            className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 text-black shadow-[0_10px_30px_rgba(46,254,60,0.3)] active:scale-95 transition-all"
                            onClick={() => {
                                setActiveOrderCode(null);
                                setIsOpen(false);
                            }}
                        >
                            Konfirmasi & Pesan Lagi
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

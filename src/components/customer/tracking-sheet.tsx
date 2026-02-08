"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Circle, Clock, ChefHat, Truck, Utensils, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Order Status Types (Match Prisma Enum)
type OrderStatus = "PENDING" | "PAID" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

interface OrderDetails {
    id: string;
    orderCode: string;
    status: OrderStatus;
    totalAmount: number;
    createdAt: string;
    orderItems: {
        id: string;
        quantity: number;
        price: number;
        menu: {
            name: string;
        };
        selectedOptions: {
            optionValue: string;
        }[];
    }[];
}

const STEPS = [
    { status: "PENDING", label: "Menunggu Konfirmasi", icon: Clock },
    { status: "PREPARING", label: "Sedang Disiapkan", icon: ChefHat },
    { status: "READY", label: "Siap Diantar", icon: Truck },
    { status: "SERVED", label: "Selesai", icon: Utensils },
];

export function TrackingSheet() {
    // Optimization: Select only what we need to prevent re-renders on cart changes
    const activeOrderCode = useCart((state) => state.activeOrderCode);
    const setActiveOrderCode = useCart((state) => state.setActiveOrderCode);

    const [isOpen, setIsOpen] = useState(false);
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Initial Fetch & Polling
    useEffect(() => {
        if (!activeOrderCode || !isOpen) return;

        const controller = new AbortController();
        const signal = controller.signal;

        const fetchOrder = async () => {
            try {
                // In a real app, use SWR/TanStack Query
                // We use the consolidated [id] endpoint which handles both ID and Code
                const res = await fetch(`/api/orders/${activeOrderCode}`, { signal });
                if (!res.ok) {
                    if (res.status === 404) {
                        // Order expired or invalid
                        setActiveOrderCode(null);
                        setIsOpen(false);
                        return true; // Stop polling
                    }
                    throw new Error("Gagal mengambil data pesanan");
                }
                const data = await res.json();
                setOrder(data);

                // Stop polling if served or cancelled
                if (data.status === "SERVED" || data.status === "CANCELLED") {
                    return true; // Signal to stop
                }
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    console.error("Tracking Error:", error);
                }
            }
            return false;
        };

        fetchOrder();
        setIsLoading(true);

        const interval = setInterval(async () => {
            const shouldStop = await fetchOrder();
            if (shouldStop) clearInterval(interval);
            setIsLoading(false);
        }, 5000); // Poll every 5s

        return () => {
            clearInterval(interval);
            controller.abort();
        };
    }, [activeOrderCode, isOpen, setActiveOrderCode]);

    if (!activeOrderCode) return null;

    // Determine current step index
    const getCurrentStepIndex = (status: OrderStatus) => {
        switch (status) {
            case "PENDING": return 0;
            case "PAID": return 0; // Treat PAID same as PENDING for now (Concept: Queue)
            case "PREPARING": return 1;
            case "READY": return 2;
            case "SERVED": return 3;
            default: return -1;
        }
    };

    const currentStep = order ? getCurrentStepIndex(order.status) : 0;
    const isCancelled = order?.status === "CANCELLED";

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="secondary"
                    size="sm"
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/90 text-white backdrop-blur-md border border-white/10 shadow-xl rounded-full px-6 py-6 animate-in slide-in-from-bottom-10 fade-in duration-500"
                >
                    <Clock className="w-4 h-4 mr-2 text-primary animate-pulse" />
                    Lacak Pesanan
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[2rem] border-t border-white/10 bg-zinc-950 p-0 flex flex-col">
                <div className="p-6 pb-2">
                    <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-6" />
                    <SheetHeader className="text-left mb-6">
                        <SheetTitle className="text-2xl font-black text-white flex items-center justify-between">
                            <span>Status Pesanan</span>
                            {order && <Badge variant="outline" className="text-xs font-mono">{order.orderCode}</Badge>}
                        </SheetTitle>
                    </SheetHeader>

                    {/* Stepper */}
                    {!isCancelled ? (
                        <div className="relative flex justify-between px-2 mb-8">
                            {/* Line Background */}
                            <div className="absolute top-3 left-4 right-4 h-0.5 bg-zinc-800 -z-10" />

                            {/* Progress Line */}
                            <div
                                className="absolute top-3 left-4 h-0.5 bg-primary -z-10 transition-all duration-1000"
                                style={{ width: `${(currentStep / (STEPS.length - 1)) * 90}%` }} // Approximate width
                            />

                            {STEPS.map((step, index) => {
                                const isActive = index <= currentStep;
                                const isCurrent = index === currentStep;
                                const Icon = step.icon;

                                return (
                                    <div key={step.status} className="flex flex-col items-center gap-2">
                                        <div className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-zinc-950",
                                            isActive ? "border-primary text-primary" : "border-zinc-800 text-zinc-600",
                                            isCurrent && "ring-4 ring-primary/20 scale-110"
                                        )}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-medium text-center max-w-[60px] leading-tight transition-colors duration-300",
                                            isActive ? "text-white" : "text-zinc-600"
                                        )}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4 mb-6">
                            <XCircle className="w-8 h-8 text-red-500" />
                            <div>
                                <h3 className="text-white font-bold">Pesanan Dibatalkan</h3>
                                <p className="text-zinc-400 text-xs">Pesanan ini telah dibatalkan oleh sistem/admin.</p>
                            </div>
                        </div>
                    )}
                </div>

                <Separator className="bg-zinc-800" />

                {/* Order Details List */}
                <ScrollArea className="flex-1 p-6">
                    {order ? (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                {order.orderItems.map((item) => (
                                    <div key={item.id} className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-primary font-bold text-sm">{item.quantity}x</span>
                                                <span className="text-zinc-200 text-sm font-medium">{item.menu.name}</span>
                                            </div>
                                            {item.selectedOptions.length > 0 && (
                                                <p className="text-xs text-zinc-500 pl-6">
                                                    {item.selectedOptions.map(o => o.optionValue).join(", ")}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-zinc-400 text-sm font-medium">
                                            Rp {item.price.toLocaleString("id-ID")}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <Separator className="bg-zinc-800" />

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-zinc-400 font-medium">Total Tagihan</span>
                                <span className="text-xl font-black text-primary">
                                    Rp {order.totalAmount.toLocaleString("id-ID")}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 space-y-3">
                            <Clock className="w-8 h-8 text-zinc-800 animate-spin" />
                            <p className="text-zinc-500 text-xs">Memuat data pesanan...</p>
                        </div>
                    )}
                </ScrollArea>

                {order?.status === "SERVED" && (
                    <div className="p-6 border-t border-white/10 bg-zinc-900/50">
                        <Button
                            className="w-full h-12 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700"
                            onClick={() => {
                                setActiveOrderCode(null);
                                setIsOpen(false);
                            }}
                        >
                            Tutup & Pesan Lagi
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

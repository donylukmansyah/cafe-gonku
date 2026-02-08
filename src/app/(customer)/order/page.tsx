"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCustomerMenus, Menu } from "@/hooks/use-customer-menus";
import { useCart } from "@/hooks/use-cart";
import { MenuGrid } from "@/components/customer/menu-grid";
import { ItemModal } from "@/components/customer/item-modal";
import { CartSheet } from "@/components/customer/cart-sheet";
import { TrackingSheet } from "@/components/customer/tracking-sheet";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Loader2, Utensils, MapPin } from "lucide-react";
import { toast } from "sonner";

function OrderContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tableQr = searchParams.get("table"); // GONKU_TABLE_1_...

    const { menus, isLoading: isMenusLoading } = useCustomerMenus();

    // Optimization: Select only what is needed to reduce re-renders
    const items = useCart((state) => state.items);
    const tableId = useCart((state) => state.tableId);
    const setTableId = useCart((state) => state.setTableId);
    const clearCart = useCart((state) => state.clearCart);
    const getTotal = useCart((state) => state.getTotal);
    const getItemCount = useCart((state) => state.getItemCount);
    const setActiveOrderCode = useCart((state) => state.setActiveOrderCode);

    // ...

    const handleCheckout = async () => {
        if (!tableId) {
            toast.error("Silakan scan QR Code meja dulu ya!");
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tableId,
                    items,
                    totalAmount: getTotal(),
                }),
            });

            if (!res.ok) throw new Error("Gagal membuat pesanan");

            const order = await res.json();
            setActiveOrderCode(order.orderCode); // Save for tracking
            toast.success("Pesanan berhasil dikirim ke dapur! 👨‍🍳");
            clearCart();
            setIsCartOpen(false);

            // Tracking sheet will appear automatically due to activeOrderCode
        } catch (error) {
            toast.error("Gagal membuat pesanan. Coba lagi ya.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isTableValidating, setIsTableValidating] = useState(true);
    const [tableNumber, setTableNumber] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Validate Table QR
    useEffect(() => {
        const validateTable = async () => {
            if (!tableQr) {
                setIsTableValidating(false);
                return;
            }

            try {
                // Fetch tables to find match
                const res = await fetch("/api/tables");
                const tables = await res.json();
                const table = tables.find((t: any) => t.qrCode === tableQr);

                if (table) {
                    if (!table.isActive) {
                        toast.error("Meja ini sedang tidak aktif.");
                        return;
                    }
                    setTableId(table.id);
                    setTableNumber(table.tableNumber);
                } else {
                    toast.error("QR Code Meja tidak valid.");
                }
            } catch (error) {
                toast.error("Gagal validasi meja.");
            } finally {
                setIsTableValidating(false);
            }
        };

        validateTable();
    }, [tableQr, setTableId]);

    const handleSelectItem = (menu: Menu) => {
        setSelectedMenu(menu);
        setIsItemModalOpen(true);
    };

    if (isTableValidating || isMenusLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Utensils className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
                </div>
                <p className="text-zinc-500 font-bold text-sm animate-pulse">Menyiapkan Menu...</p>
            </div>
        );
    }

    if (!tableQr || !tableId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center space-y-6">
                <div className="w-20 h-20 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center border border-white/5">
                    <MapPin className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white">Oops! Meja Belum Terdeteksi</h2>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                        Silakan scan QR Code yang ada di meja kamu untuk mulai memesan makanan.
                    </p>
                </div>
                <Button
                    className="bg-primary text-black font-black w-full rounded-2xl h-12"
                    onClick={() => router.push("/")}
                >
                    Kembali Ke Home
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <header className="p-6 flex items-center justify-between z-20 relative">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        CAFE <span className="text-primary">GONKU</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(46,254,60,0.5)]" />
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                            Meja #{tableNumber}
                        </span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="relative bg-zinc-900/50 border border-white/10 rounded-full w-12 h-12 hover:bg-primary/20 hover:text-primary transition-all"
                    onClick={() => setIsCartOpen(true)}
                >
                    <ShoppingBag className="w-5 h-5 text-zinc-400 group-hover:text-primary" />
                    {getItemCount() > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-black text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-zinc-950 animate-in zoom-in">
                            {getItemCount()}
                        </span>
                    )}
                </Button>
            </header>

            <MenuGrid menus={menus} isLoading={isMenusLoading} onSelectItem={handleSelectItem} />

            {/* Bottom Bar (Quick Cart View) */}
            {getItemCount() > 0 && (
                <div className="fixed bottom-6 left-4 right-4 z-30 animate-in slide-in-from-bottom-10 duration-500">
                    <Button
                        className="w-full h-16 bg-zinc-900/90 border border-white/10 rounded-full p-2 pr-6 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)] active:scale-95 transition-all backdrop-blur-md group hover:bg-zinc-800 hover:border-sidebar-primary/50"
                        onClick={() => setIsCartOpen(true)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary text-black rounded-full flex items-center justify-center font-bold shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                <ShoppingBag className="w-5 h-5 fill-current" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-300">Total Pesanan</span>
                                <span className="text-base font-black text-white group-hover:text-primary transition-colors">
                                    {getItemCount()} Items • Rp {getTotal().toLocaleString("id-ID")}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                            Lihat
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="mb-0.5">›</span>
                            </div>
                        </div>
                    </Button>
                </div>
            )}

            <ItemModal
                menu={selectedMenu}
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
            />

            <CartSheet
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                onCheckout={handleCheckout}
            />

            {isSubmitting && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-white font-black uppercase tracking-widest text-xs">Mengirim Pesanan...</p>
                </div>
            )}

            {/* Call Waiter Button */}
            <Button
                variant="secondary"
                size="icon"
                className="fixed bottom-24 right-4 z-40 bg-white/10 text-white backdrop-blur-md border border-white/10 shadow-xl rounded-full w-12 h-12 hover:bg-primary hover:text-black transition-all duration-300"
                onClick={() => {
                    toast.promise(
                        fetch("/api/tables/call", { method: "POST" }),
                        {
                            loading: "Memanggil pelayan...",
                            success: "Pelayan segera datang! 🏃",
                            error: "Gagal memanggil pelayan",
                        }
                    );
                }}
            >
                <span className="sr-only">Panggil Pelayan</span>
                <div className="relative">
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    <span className="text-lg">🔔</span>
                </div>
            </Button>

            <TrackingSheet />
        </div>
    );
}

export default function OrderPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        }>
            <OrderContent />
        </Suspense>
    );
}

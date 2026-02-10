"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/use-cart";
import { useSnap } from "@/hooks/use-snap";
import { MenuGrid } from "@/components/customer/menu-grid";
import { ItemModal } from "@/components/customer/item-modal";
import { CartSheet } from "@/components/customer/cart-sheet";
import { TrackingSheet } from "@/components/customer/tracking-sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Menu } from "@/types/menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Utensils, Coffee, Cookie, IceCream, LayoutGrid, Search } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { OrderResponse } from "@/types/order";

interface OrderClientProps {
    initialMenus?: Menu[];
    table: {
        id: string;
        tableNumber: number;
        qrCode: string;
    };
}

export function OrderClient({ initialMenus = [], table }: OrderClientProps) {
    const router = useRouter();

    // 0. Local state for menus (for real-time availability updates)
    const [menus, setMenus] = useState<Menu[]>(initialMenus || []);
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Dynamic Categories based on available menus
    const categories = useMemo(() => {
        if (!menus) return [];
        const uniqueCategories = Array.from(new Set(menus.map(m => m.category))).sort();

        const getIcon = (cat: string) => {
            switch (cat) {
                case "FOOD": return Utensils;
                case "DRINK": return Coffee;
                case "SNACK": return Cookie;
                case "DESSERT": return IceCream;
                default: return LayoutGrid;
            }
        };

        return [
            { id: "ALL", label: "Semua", icon: LayoutGrid },
            ...uniqueCategories.map(cat => ({ id: cat, label: cat, icon: getIcon(cat) }))
        ];
    }, [menus]);

    const filteredMenus = useMemo(() => {
        return menus.filter((menu) => {
            const matchesCategory = activeCategory === "ALL" || menu.category === activeCategory;
            const matchesSearch = menu.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [menus, activeCategory, searchQuery]);

    // Optimization: Select only what is needed to reduce re-renders
    const items = useCart((state) => state.items);
    // ... rest of selectors ...
    const tableId = useCart((state) => state.tableId);
    const setTableId = useCart((state) => state.setTableId);
    const clearCart = useCart((state) => state.clearCart);
    const getTotal = useCart((state) => state.getTotal);
    const setActiveOrderCode = useCart((state) => state.setActiveOrderCode);
    const hasHydrated = useCart((state) => state.hasHydrated);

    // --- REAL-TIME MENU SYNC ---
    useEffect(() => {
        const channel = import("@/lib/supabase").then(({ supabase }) => {
            return supabase
                .channel("menu-updates")
                .on("broadcast", { event: "menu-update" }, (payload) => {
                    const { menuId, isAvailable } = payload.payload;
                    if (menuId) {
                        setMenus(prev => prev.map(m =>
                            m.id === menuId ? { ...m, isAvailable } : m
                        ));
                    }
                })
                .subscribe();
        });

        return () => {
            channel.then(c => {
                import("@/lib/supabase").then(({ supabase }) => {
                    supabase.removeChannel(c);
                });
            });
        };
    }, []);

    // Sync Table ID from Server to Store (once)
    useEffect(() => {
        if (table?.id && tableId !== table.id) {
            setTableId(table.id);
        }
    }, [table, tableId, setTableId]);

    // ... rest of effects and handlers ...
    // OPTIMIZATION: Handle Midtrans Redirect Return (Best Practice)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const orderIdParam = params.get("order_id");
        const statusParam = params.get("transaction_status");

        if (orderIdParam) {
            setActiveOrderCode(orderIdParam);
            clearCart();
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);

            if (statusParam === "settlement" || statusParam === "capture") {
                toast.success("Pembayaran Berhasil! Pesanan diproses ⚡");
            } else if (statusParam === "pending") {
                toast.info("Sedang memverifikasi pembayaran... ⏳");
            }
        }
    }, [setActiveOrderCode, clearCart]);

    const itemCount = useMemo(() => {
        if (!hasHydrated) return 0;
        return items.reduce((count, item) => count + item.quantity, 0);
    }, [items, hasHydrated]);

    const { snapPay, snapLoaded } = useSnap();

    const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCheckout = async () => {
        if (!table.id) {
            toast.error("Silakan scan QR Code meja dulu ya!");
            return;
        }

        try {
            setIsSubmitting(true);

            // Security Refactor: Map items to match server's Zod schema
            const orderPayload = {
                tableId: table.id,
                items: items.map(item => ({
                    menuId: item.id,
                    quantity: item.quantity,
                    notes: item.notes,
                    selectedOptions: item.selectedOptions.map(opt => ({
                        menuOptionValueId: opt.valueId,
                        optionName: opt.optionName,
                        optionValue: opt.optionValue,
                        priceAdjust: opt.priceAdjust
                    }))
                }))
            };

            const order = await apiFetch<OrderResponse>("/api/orders", {
                method: "POST",
                body: JSON.stringify(orderPayload),
            });

            if (order.midtransToken) {
                setIsSubmitting(false);
                setIsCartOpen(false);

                snapPay(order.midtransToken, {
                    onSuccess: async () => {
                        toast.success("Pembayaran Berhasil! 💸");
                        setActiveOrderCode(order.orderCode);
                        clearCart();
                    },
                    onPending: async () => {
                        toast.info("Menunggu Pembayaran... ⏳");
                        setActiveOrderCode(order.orderCode);
                        clearCart();
                    },
                    onError: () => {
                        toast.error("Pembayaran Gagal 😢");
                        setActiveOrderCode(order.orderCode);
                        clearCart();
                    },
                    onClose: () => {
                        toast.warning("Pembayaran belum selesai");
                        setActiveOrderCode(order.orderCode);
                        clearCart();
                    }
                });
            } else {
                setActiveOrderCode(order.orderCode);
                toast.success("Pesanan berhasil dikirim ke dapur! 👨‍🍳");
                clearCart();
                setIsCartOpen(false);
            }

        } catch (error) {
            // Error already handled by apiFetch (toast)
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectItem = (menu: Menu) => {
        setSelectedMenu(menu);
        setIsItemModalOpen(true);
    };

    return (
        <div className="min-h-screen pb-24">
            <header className="sticky top-0 h-20 p-6 flex items-center justify-between z-50 bg-zinc-950/60 backdrop-blur-xl border-b border-white/5 transition-all duration-500">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2 group">
                        GON<span className="text-primary italic group-hover:skew-x-12 transition-transform">KU</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(46,254,60,0.8)]" />
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5 opacity-80 group cursor-default">
                        <div className="w-2 h-2 rounded-full bg-primary/20 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(46,254,60,0.5)]" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-primary transition-colors">
                            TABLE <span className="text-white">#{table.tableNumber}</span>
                        </span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="relative bg-zinc-900/80 border border-white/5 rounded-2xl w-12 h-12 hover:bg-primary/20 hover:text-primary transition-all shadow-lg active:scale-90"
                    onClick={() => setIsCartOpen(true)}
                >
                    <ShoppingCart className="w-5 h-5 text-zinc-300" />
                    {itemCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-black text-[10px] font-black rounded-lg flex items-center justify-center shadow-[0_4px_15px_rgba(46,254,60,0.4)] border-2 border-zinc-950 animate-in zoom-in duration-300">
                            {itemCount}
                        </span>
                    )}
                </Button>
            </header>

            {/* Sticky Search & Categories */}
            <div className="sticky top-[80px] z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 shadow-2xl shadow-zinc-950/50 transition-all duration-300 transform-gpu">
                <div className="px-5 pt-4 pb-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                            placeholder="Cari menu favoritmu..."
                            className="pl-11 h-12 bg-zinc-900 border-white/5 rounded-2xl focus-visible:ring-primary/20 text-sm placeholder:text-zinc-600 w-full font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Categories */}
                    <div className="w-full overflow-hidden">
                        <div className="flex overflow-x-auto no-scrollbar gap-3 pb-1 snap-x">
                            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
                                <TabsList className="bg-transparent h-auto p-0 flex gap-3 w-max">
                                    {categories.map((cat) => {
                                        const Icon = cat.icon;
                                        return (
                                            <TabsTrigger
                                                key={cat.id}
                                                value={cat.id}
                                                className="px-5 py-2.5 rounded-2xl border border-white/5 bg-zinc-900 data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:border-primary/50 text-xs font-bold transition-all shadow-sm whitespace-nowrap capitalize flex items-center gap-2 snap-center group"
                                            >
                                                <Icon className="w-4 h-4" />
                                                {cat.label.toLowerCase()}
                                            </TabsTrigger>
                                        );
                                    })}
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </div>

            <MenuGrid
                menus={filteredMenus}
                allMenus={menus}
                searchQuery={searchQuery}
                activeCategory={activeCategory}
                isLoading={false}
                onSelectItem={handleSelectItem}
            />

            {itemCount > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40 animate-in slide-in-from-bottom-10 duration-700">
                    <Button
                        className="w-full h-16 bg-zinc-900/90 border border-white/10 rounded-full p-2 pr-6 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.6)] active:scale-95 transition-all backdrop-blur-xl group hover:bg-zinc-800/95 hover:border-primary/40 ring-1 ring-white/5"
                        onClick={() => setIsCartOpen(true)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary text-black rounded-full flex items-center justify-center font-bold shadow-[0_8px_20px_rgba(46,254,60,0.15)] group-hover:scale-105 transition-transform duration-500">
                                <ShoppingCart className="w-5 h-5 fill-current" />
                            </div>
                            <div className="flex flex-col items-start translate-y-0.5">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-primary/70 transition-colors">Checkout</span>
                                <span className="text-sm font-black text-white group-hover:text-primary transition-colors">
                                    Rp {getTotal().toLocaleString("id-ID")}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-all duration-300">
                            Bayar
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20">
                                <span className="mb-0.5 text-lg leading-none">›</span>
                            </div>
                        </div>
                    </Button>
                </div >
            )
            }

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

            {
                isSubmitting && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-white font-black uppercase tracking-widest text-xs">Mengirim Pesanan...</p>
                    </div>
                )
            }

            <TrackingSheet />
        </div >
    );
}

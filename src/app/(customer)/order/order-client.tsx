"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useCart, CartItem, getOptionsHash } from "@/hooks/use-cart";
import { useSnap } from "@/hooks/use-snap";
import { MenuGrid } from "@/components/customer/menu-grid";
import dynamic from "next/dynamic";

const ItemModal = dynamic(() => import("@/components/customer/item-modal").then(mod => mod.ItemModal), { ssr: false });
const CartSheet = dynamic(() => import("@/components/customer/cart-sheet").then(mod => mod.CartSheet), { ssr: false });
const TrackingSheet = dynamic(() => import("@/components/customer/tracking-sheet").then(mod => mod.TrackingSheet), { ssr: false });
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Menu } from "@/types/menu";
import { CustomerHeader } from "@/components/customer/customer-header";
import { Utensils, Coffee, Cookie, IceCream, LayoutGrid } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { OrderResponse } from "@/types/order";
import { REALTIME_CHANNELS } from "@/lib/realtime-channels";

interface OrderClientProps {
    initialMenus?: Menu[];
    table: {
        id: string;
        tableNumber: number;
        qrCode: string;
    };
}

// Custom Hook for Debouncing State
function useDebounce<T>(value: T, delay: number = 250): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Lightweight Fuzzy Matching Algorithm
function fuzzyMatch(text: string, query: string): boolean {
    const cleanText = text.toLowerCase().trim();
    const cleanQuery = query.toLowerCase().trim();

    if (!cleanQuery) return true;
    
    // Exact or direct substring match
    if (cleanText.includes(cleanQuery)) return true;

    const textWords = cleanText.split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, ""));
    const queryWords = cleanQuery.split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, ""));

    // Check Levenshtein distance for word level similarities
    const getLevenshteinDistance = (a: string, b: string): number => {
        const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
        for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        return matrix[a.length][b.length];
    };

    return queryWords.every(qw => {
        if (!qw) return true;
        
        // Subsequence match (e.g. "mny" matches "Mie Nyemek")
        let queryIdx = 0;
        for (let textIdx = 0; textIdx < cleanText.length; textIdx++) {
            if (cleanText[textIdx] === qw[queryIdx]) {
                queryIdx++;
            }
            if (queryIdx === qw.length) {
                return true;
            }
        }

        const maxEdits = qw.length <= 3 ? 0 : qw.length <= 6 ? 1 : 2;

        return textWords.some(tw => {
            if (tw.startsWith(qw) || qw.startsWith(tw)) return true;
            const distance = getLevenshteinDistance(tw, qw);
            return distance <= maxEdits;
        });
    });
}

export function OrderClient({ initialMenus = [], table }: OrderClientProps) {
    // 0. Local state for menus (for real-time availability updates)
    const [menus, setMenus] = useState<Menu[]>(initialMenus);
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 250);

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
            const matchesSearch = fuzzyMatch(menu.name, debouncedSearchQuery);
            return matchesCategory && matchesSearch;
        });
    }, [menus, activeCategory, debouncedSearchQuery]);

    const items = useCart((state) => state.items);
    const tableId = useCart((state) => state.tableId);
    const setTableId = useCart((state) => state.setTableId);
    const clearCart = useCart((state) => state.clearCart);
    const getTotal = useCart((state) => state.getTotal);
    const setActiveOrderCode = useCart((state) => state.setActiveOrderCode);
    const hasHydrated = useCart((state) => state.hasHydrated);
    const updateItemPrices = useCart((state) => state.updateItemPrices);
    const removeItemsByMenuId = useCart((state) => state.removeItemsByMenuId);
    const diningType = useCart((state) => state.diningType);

    useEffect(() => {
        const channel = import("@/lib/supabase").then(({ supabase }) => {
            return supabase
                .channel(REALTIME_CHANNELS.menuUpdates)
                .on("broadcast", { event: "menu-update" }, (payload) => {
                    const { menuId, isAvailable, fullMenu } = payload.payload;
                    if (fullMenu) {
                        setMenus(prev => prev.map(m =>
                            m.id === fullMenu.id ? { ...m, ...fullMenu } : m
                        ));
                    } else if (menuId) {
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

    useEffect(() => {
        if (table?.id && tableId !== table.id) {
            setTableId(table.id);
        }
    }, [table, tableId, setTableId]);

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
                toast.success("Pembayaran Berhasil! Pesanan diproses");
            } else if (statusParam === "pending") {
                toast.info("Sedang memverifikasi pembayaran...");
            }
        }
    }, [setActiveOrderCode, clearCart]);

    const itemCount = useMemo(() => {
        if (!hasHydrated) return 0;
        return items.reduce((count, item) => count + item.quantity, 0);
    }, [items, hasHydrated]);

    const { snapPay } = useSnap();

    const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);
    const [editItemHash, setEditItemHash] = useState<string | null>(null);

    const formatPrice = useCallback((price: number) => `Rp ${price.toLocaleString("id-ID")}`, []);

    const SERVICE_FEE_RATE = 0.1;
    const ROUND_TO = 1000;

    const handleCheckout = async () => {
        if (!table.id) {
            toast.error("Silakan scan QR Code meja dulu ya!");
            return;
        }

        try {
            setIsSubmitting(true);

            const verifyResult = await apiFetch<{
                verified: boolean;
                changes: {
                    menuId: string;
                    name: string;
                    oldPrice: number;
                    newPrice: number;
                    unavailable?: boolean;
                    optionChanges?: { valueId: string; oldAdjust: number; newAdjust: number }[];
                }[];
            }>("/api/menus/verify-prices", {
                method: "POST",
                body: JSON.stringify({
                    items: items.map(item => ({
                        menuId: item.id,
                        price: item.price,
                        selectedOptions: item.selectedOptions.map(opt => ({
                            valueId: opt.valueId,
                            priceAdjust: opt.priceAdjust,
                        })),
                    })),
                }),
                silent: true,
            });

            if (!verifyResult.verified) {
                const unavailableItems = verifyResult.changes.filter(c => c.unavailable);
                const priceChangedItems = verifyResult.changes.filter(c => !c.unavailable);

                for (const item of unavailableItems) {
                    removeItemsByMenuId(item.menuId);
                }

                if (priceChangedItems.length > 0) {
                    updateItemPrices(
                        priceChangedItems.map(c => ({
                            menuId: c.menuId,
                            newPrice: c.newPrice,
                            optionChanges: c.optionChanges?.map(o => ({
                                valueId: o.valueId,
                                newAdjust: o.newAdjust,
                            })),
                        }))
                    );
                }

                const messages: string[] = [];
                for (const item of unavailableItems) {
                    messages.push(`"${item.name}" sudah tidak tersedia dan dihapus dari keranjang.`);
                }
                for (const item of priceChangedItems) {
                    messages.push(`"${item.name}" harganya berubah: ${formatPrice(item.oldPrice)} → ${formatPrice(item.newPrice)}`);
                }

                toast.warning("Ada perubahan harga!", {
                    description: messages.join("\n"),
                    duration: 6000,
                });

                setIsSubmitting(false);
                return;
            }

            const subtotal = items.reduce((acc, item) => {
                const optionsPrice = item.selectedOptions.reduce((optAcc, opt) => optAcc + opt.priceAdjust, 0);
                return acc + (item.price + optionsPrice) * item.quantity;
            }, 0);
            const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
            const beforeRounding = subtotal + serviceFee;
            const grandTotal = Math.round(beforeRounding / ROUND_TO) * ROUND_TO;
            const rounding = grandTotal - beforeRounding;

            const diningPrefix = diningType === "DINE_IN" ? "[Makan di Tempat]" : "[Bawa Pulang]";

            const orderPayload = {
                tableId: table.id,
                items: items.map(item => ({
                    menuId: item.id,
                    quantity: item.quantity,
                    notes: `${diningPrefix}${item.notes ? ` \nCatatan Item: ${item.notes}` : ""}`,
                    selectedOptions: item.selectedOptions.map(opt => ({
                        menuOptionValueId: opt.valueId,
                        optionName: opt.optionName,
                        optionValue: opt.optionValue,
                        priceAdjust: opt.priceAdjust
                    }))
                })),
                serviceFee,
                rounding,
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
                        toast.success("Pembayaran Berhasil!");

                        try {
                            await apiFetch(`/api/orders/${order.orderCode}/check-payment`, { method: "POST" });
                        } catch (error) {
                            console.error("Proactive check-payment failed:", error);
                        }

                        setActiveOrderCode(order.orderCode);
                        clearCart();
                    },
                    onPending: async () => {
                        toast.info("Menunggu Pembayaran...");
                        setActiveOrderCode(order.orderCode);
                        clearCart();
                    },
                    onError: () => {
                        toast.error("Pembayaran Gagal");
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
                toast.success("Pesanan berhasil dikirim ke dapur!");
                clearCart();
                setIsCartOpen(false);
            }

        } catch {
            // Error already handled by apiFetch (toast)
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectItem = (menu: Menu) => {
        setSelectedMenu(menu);
        setIsItemModalOpen(true);
    };

    const handleEditItem = (item: CartItem) => {
        const menuToEdit = menus.find(m => m.id === item.id);
        if (!menuToEdit) return;

        setEditingItem(item);
        setEditItemHash(getOptionsHash(item.selectedOptions));
        setSelectedMenu(menuToEdit);
        setIsCartOpen(false);
        setIsItemModalOpen(true);
    };

    const handleCloseItemModal = () => {
        setIsItemModalOpen(false);
        setSelectedMenu(null);
        setEditingItem(null);
        setEditItemHash(null);
        // UX: Re-open the cart sheet after saving
        setIsCartOpen(true);
    };

    return (
        <div className="min-h-screen pb-24">
            <CustomerHeader
                tableNumber={table.tableNumber}
                itemCount={itemCount}
                onOpenCart={() => setIsCartOpen(true)}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
            />

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
                            <div className="w-12 h-12 bg-primary text-black rounded-full flex items-center justify-center font-bold shadow-[0_8px_20px_rgba(53,183,24,0.15)] group-hover:scale-105 transition-transform duration-500">
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
                key={`${selectedMenu?.id ?? "empty"}-${editItemHash ?? "new"}`}
                menu={selectedMenu}
                isOpen={isItemModalOpen}
                onClose={editingItem ? handleCloseItemModal : () => setIsItemModalOpen(false)}
                initialCartItem={editingItem}
                editItemHash={editItemHash}
            />

            <CartSheet
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                onCheckout={handleCheckout}
                isSubmitting={isSubmitting}
                allMenus={menus}
                onSelectItem={handleSelectItem}
                onEditItem={handleEditItem}
            />

            <TrackingSheet />
        </div >
    );
}

"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useCart } from "@/features/orders/hooks/use-cart";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingCart, Loader2, Sparkles, UtensilsCrossed, ShoppingBag, Edit3, PlusCircle } from "lucide-react";
import { Menu } from "@/features/menus/types";
import { CartItem } from "@/features/orders/hooks/use-cart";
import { normalizeImageUrl } from "@/features/menus/image-url";

const SERVICE_FEE_RATE = 0.1;
const ROUND_TO = 1000; // Match Gacoan-like totals: Rp23.001 -> Rp23.000

function calculatePaymentBreakdown(subtotal: number) {
    const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
    const beforeRounding = subtotal + serviceFee;
    const grandTotal = Math.round(beforeRounding / ROUND_TO) * ROUND_TO;
    const rounding = grandTotal - beforeRounding;

    return { serviceFee, rounding, grandTotal };
}

interface CartSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onCheckout: () => void;
    isSubmitting: boolean;
    allMenus: Menu[];
    onSelectItem: (menu: Menu) => void;
    onEditItem: (item: CartItem) => void;
}

export function CartSheet({ isOpen, onClose, onCheckout, isSubmitting, allMenus = [], onSelectItem, onEditItem }: CartSheetProps) {
    const { items, updateQuantity, removeItem, diningType, setDiningType } = useCart();

    const count = items.reduce((acc, item) => acc + item.quantity, 0);

    const { subtotal, serviceFee, rounding, grandTotal } = useMemo(() => {
        const sub = items.reduce((acc, item) => {
            const optionsPrice = item.selectedOptions.reduce((optAcc, opt) => optAcc + opt.priceAdjust, 0);
            return acc + (item.price + optionsPrice) * item.quantity;
        }, 0);
        return { subtotal: sub, ...calculatePaymentBreakdown(sub) };
    }, [items]);

    const relatedMenus = useMemo(() => {
        if (!isOpen || allMenus.length === 0) return [];

        const cartMenuIds = new Set(items.map(i => i.id));
        const cartCategories = new Set(
            allMenus.filter(m => cartMenuIds.has(m.id)).map(m => m.category)
        );

        const availableRecommendations = allMenus.filter(
            m => m.isActive && m.isAvailable && !cartMenuIds.has(m.id)
        );

        return availableRecommendations.sort((a, b) => {
            const aComplementary = !cartCategories.has(a.category);
            const bComplementary = !cartCategories.has(b.category);
            if (aComplementary && !bComplementary) return -1;
            if (!aComplementary && bComplementary) return 1;
            return 0;
        }).slice(0, 8);
    }, [allMenus, items, isOpen]);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="bottom" className="h-[92vh] bg-zinc-950 border-white/5 border-x rounded-t-[2.5rem] p-0 overflow-hidden flex flex-col shadow-2xl max-w-md mx-auto inset-x-0">
                <SheetDescription className="sr-only">
                    Ringkasan keranjang, tipe makan, rekomendasi menu, dan tombol checkout.
                </SheetDescription>
                <div className="w-full flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-zinc-800 rounded-full" />
                </div>

                <SheetHeader className="px-6 pb-3">
                    <SheetTitle className="text-lg font-black text-white flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        Keranjang
                        <Badge className="bg-primary text-black border-none text-[10px] font-black">{count}</Badge>
                    </SheetTitle>
                </SheetHeader>

                <Separator className="bg-zinc-900" />

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hidden">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
                            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-bold">Keranjangmu kosong nih...</p>
                        </div>
                    ) : (
                        <>
                            {/* Modern Persisted Dining Type Selector */}
                            <div className="bg-zinc-900/60 p-1 rounded-2xl border border-white/5 flex gap-1 shrink-0">
                                <button
                                    onClick={() => setDiningType("DINE_IN")}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 ${diningType === "DINE_IN"
                                        ? "bg-primary text-black shadow-lg shadow-primary/15 scale-[1.01]"
                                        : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                >
                                    <UtensilsCrossed className="w-3 h-3 shrink-0" />
                                    Makan di Tempat
                                </button>
                                <button
                                    onClick={() => setDiningType("TAKEAWAY")}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 ${diningType === "TAKEAWAY"
                                        ? "bg-primary text-black shadow-lg shadow-primary/15 scale-[1.01]"
                                        : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                >
                                    <ShoppingBag className="w-3 h-3 shrink-0" />
                                    Bawa Pulang
                                </button>
                            </div>

                            {/* Horizontal Recommendation Carousel "Menu Terkait" */}
                            {relatedMenus.length > 0 && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-3 duration-500 overflow-hidden w-full">
                                    <div className="flex items-center gap-1.5 px-0.5">
                                        <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                                        <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest leading-none">Menu Terkait</h4>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-1.5 snap-x scrollbar-hidden w-full">
                                        {relatedMenus.map((menu) => (
                                            <div
                                                key={menu.id}
                                                onClick={() => onSelectItem(menu)}
                                                className="w-40 bg-zinc-900/40 hover:bg-zinc-900/70 border border-white/5 rounded-2xl p-2 flex items-center gap-2 shrink-0 snap-start active:scale-95 transition-all duration-300 cursor-pointer group"
                                            >
                                                <div className="relative w-9 h-9 bg-zinc-900 rounded-xl border border-white/5 overflow-hidden shrink-0 shadow-md">
                                                    {normalizeImageUrl(menu.imageUrl) ? (
                                                        <Image
                                                            src={normalizeImageUrl(menu.imageUrl)!}
                                                            alt={menu.name}
                                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                            fill
                                                            sizes="36px"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-black text-[8px] italic text-zinc-800">GONKU</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <p className="text-[11px] font-black text-white leading-tight truncate">{menu.name}</p>
                                                    <p className="text-[9px] font-bold text-primary mt-0.5">Rp {menu.price.toLocaleString("id-ID")}</p>
                                                </div>
                                                <div className="w-5.5 h-5.5 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all shrink-0">
                                                    <span className="text-xs font-black mb-0.5">+</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Separator className="bg-zinc-900/60" />
                                </div>
                            )}

                            {/* Cart items list */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-0.5">
                                    <h4 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Item Dipesan ({count})</h4>
                                    <button
                                        onClick={onClose}
                                        className="text-primary hover:text-primary/80 transition-all font-black text-[11px] uppercase tracking-wider flex items-center gap-1 active:scale-95 border border-primary/20 bg-primary/5 px-2.5 py-1 rounded-xl"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        Tambah Item
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {items.map((item) => {
                                        const optionsPrice = item.selectedOptions.reduce((acc, opt) => acc + opt.priceAdjust, 0);

                                        return (
                                            <div key={item.lineId} className="flex gap-3 group">
                                                <div className="relative w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 overflow-hidden flex-shrink-0 shadow-lg group-hover:border-primary/20 transition-all">
                                                    {normalizeImageUrl(item.imageUrl) ? (
                                                        <Image
                                                            src={normalizeImageUrl(item.imageUrl)!}
                                                            alt={item.name}
                                                            className="object-cover"
                                                            fill
                                                            sizes="64px"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-black text-xs italic text-zinc-800">GONKU</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-black text-white text-sm truncate tracking-tight">{item.name}</h4>
                                                            <button
                                                                onClick={() => onEditItem(item)}
                                                                className="text-zinc-500 hover:text-primary hover:bg-primary/5 border border-white/5 rounded-lg px-1.5 py-0.5 transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 active:scale-90"
                                                            >
                                                                <Edit3 className="w-2.5 h-2.5" />
                                                                Ubah
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => removeItem(item.lineId)}
                                                            className="text-zinc-700 hover:text-red-500 transition-colors p-0.5 shrink-0"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    {item.selectedOptions.length > 0 && (
                                                        <p className="text-[9px] font-bold text-zinc-500 mt-0.5 line-clamp-1 uppercase tracking-tighter">
                                                            {item.selectedOptions.map(o => o.optionValue).join(", ")}
                                                        </p>
                                                    )}
                                                    {item.notes && (
                                                        <p className="text-[9px] text-zinc-500 italic mt-0.5 truncate">&quot;{item.notes}&quot;</p>
                                                    )}
                                                    <div className="mt-auto flex items-center justify-between pt-1.5">
                                                        <span className="font-black text-primary text-sm">
                                                            Rp {((item.price + optionsPrice) * item.quantity).toLocaleString("id-ID")}
                                                        </span>
                                                        <div className="flex items-center bg-zinc-900 rounded-xl border border-white/5 p-0.5 scale-90 origin-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-zinc-500 hover:text-white"
                                                                onClick={() => updateQuantity(item.lineId, -1)}
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </Button>
                                                            <span className="w-5 text-center font-bold text-xs text-white">{item.quantity}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-primary hover:text-primary"
                                                                onClick={() => updateQuantity(item.lineId, 1)}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Cost Breakdown */}
                            <div className="border-t border-dashed border-zinc-800 pt-4">
                                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-4 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-zinc-500">Subtotal</span>
                                        <span className="text-sm font-bold text-zinc-300 tabular-nums">Rp {subtotal.toLocaleString("id-ID")}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-zinc-500">Biaya Layanan & Aplikasi</span>
                                        <span className="text-sm font-bold text-zinc-300 tabular-nums">Rp {serviceFee.toLocaleString("id-ID")}</span>
                                    </div>
                                    {rounding !== 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-zinc-500">Pembulatan</span>
                                            <span className="text-sm font-bold text-zinc-300 tabular-nums">
                                                {rounding > 0 ? "+" : "-"}Rp {Math.abs(rounding).toLocaleString("id-ID")}
                                            </span>
                                        </div>
                                    )}
                                    <Separator className="bg-zinc-800" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-black text-white">Total Bayar</span>
                                        <span className="text-xl font-black text-primary tabular-nums">Rp {grandTotal.toLocaleString("id-ID")}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {items.length > 0 && (
                    <div className="p-6 pt-3 bg-zinc-950 border-t border-white/5">
                        <Button
                            disabled={isSubmitting}
                            className="w-full h-14 bg-primary hover:bg-primary/90 text-black font-black text-base rounded-[1.5rem] shadow-[0_8px_30px_rgba(53,183,24,0.2)] active:scale-[0.98] transition-all disabled:opacity-50"
                            onClick={onCheckout}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Memproses...
                                </span>
                            ) : (
                                <span className="flex items-center justify-between w-full px-2">
                                    <span className="uppercase tracking-widest text-[11px]">Pesan Sekarang</span>
                                    <span className="font-black">Rp {grandTotal.toLocaleString("id-ID")}</span>
                                </span>
                            )}
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${className}`}>
            <span className="mb-0.5 leading-none">{children}</span>
        </span>
    );
}

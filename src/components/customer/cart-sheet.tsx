"use client";

import { useCart, getOptionsHash } from "@/hooks/use-cart";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CartSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onCheckout: () => void;
}

export function CartSheet({ isOpen, onClose, onCheckout }: CartSheetProps) {
    const { items, updateQuantity, removeItem, getTotal, getItemCount, hasHydrated } = useCart();

    // Safety check for hydration to avoid count desync
    // Calculate locally to ensure sync with items
    const count = items.reduce((acc, item) => acc + item.quantity, 0);
    const total = items.reduce((acc, item) => {
        const optionsPrice = item.selectedOptions.reduce((optAcc, opt) => optAcc + opt.priceAdjust, 0);
        return acc + (item.price + optionsPrice) * item.quantity;
    }, 0);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="bottom" className="h-[85vh] bg-zinc-950/80 backdrop-blur-2xl border-white/5 rounded-t-[3rem] p-0 overflow-hidden flex flex-col shadow-2xl">
                <SheetHeader className="p-6 pb-2">
                    <SheetTitle className="text-xl font-black text-white flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        Keranjang Belanja
                        <Badge className="bg-primary text-black border-none text-[10px] font-black">{count}</Badge>
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 no-scrollbar">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
                            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-bold">Keranjangmu kosong nih...</p>
                        </div>
                    ) : (
                        items.map((item) => {
                            const optionsHash = getOptionsHash(item.selectedOptions);
                            const optionsPrice = item.selectedOptions.reduce((acc, opt) => acc + opt.priceAdjust, 0);

                            return (
                                <div key={`${item.id}-${optionsHash}`} className="flex gap-4 group animate-in slide-in-from-right-5 duration-500">
                                    <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/5 overflow-hidden flex-shrink-0 shadow-lg group-hover:border-primary/20 transition-all">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-black text-xs italic text-zinc-800">GONKU</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="font-black text-white text-[15px] truncate tracking-tight">{item.name}</h4>
                                            <button
                                                onClick={() => removeItem(item.id, optionsHash)}
                                                className="text-zinc-700 hover:text-red-500 transition-colors p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <p className="text-[10px] font-bold text-zinc-500 mt-0.5 line-clamp-1 uppercase tracking-tighter">
                                            {item.selectedOptions.map(o => o.optionValue).join(", ")}
                                        </p>
                                        {item.notes && (
                                            <p className="text-[10px] text-zinc-400 italic mt-1 truncate bg-zinc-900/50 px-2 py-0.5 rounded-lg border border-white/5 w-fit font-medium">"{item.notes}"</p>
                                        )}

                                        <div className="mt-auto flex items-center justify-between pt-2">
                                            <span className="font-black text-primary text-sm">
                                                Rp {((item.price + optionsPrice) * item.quantity).toLocaleString("id-ID")}
                                            </span>

                                            <div className="flex items-center bg-zinc-900 rounded-xl border border-white/5 p-0.5 scale-90 origin-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500 hover:text-white"
                                                    onClick={() => updateQuantity(item.id, optionsHash, -1)}
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </Button>
                                                <span className="w-6 text-center font-bold text-xs text-white">{item.quantity}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:text-primary"
                                                    onClick={() => updateQuantity(item.id, optionsHash, 1)}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-6 space-y-4 bg-zinc-900/50 backdrop-blur-md border-t border-white/5">
                    <div className="flex justify-between items-center px-2">
                        <span className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Total Bayar</span>
                        <span className="text-2xl font-black text-white">Rp {total.toLocaleString("id-ID")}</span>
                    </div>

                    <Button
                        disabled={items.length === 0}
                        className="w-full h-14 bg-primary hover:bg-primary/90 text-black font-black text-lg rounded-[1.5rem] shadow-[0_8px_30px_rgba(46,254,60,0.2)]"
                        onClick={onCheckout}
                    >
                        Pesan Sekarang
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full ${className}`}>
            {children}
        </span>
    );
}

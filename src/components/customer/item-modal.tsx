"use client";

import { useState } from "react";
import { Menu } from "@/types/menu";
import { useCart, CartItem } from "@/hooks/use-cart";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { MenuHighlightBadge } from "@/components/menu-highlight-badge";

interface ItemModalProps {
    menu: Menu | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ItemModal({ menu, isOpen, onClose }: ItemModalProps) {
    const addItem = useCart((state) => state.addItem);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");
    const [selectedOptions, setSelectedOptions] = useState<CartItem["selectedOptions"]>([]);

    if (!menu) return null;

    const handleOptionSelect = (optionId: string, optionName: string, value: { id: string, label: string, priceAdjust: number }) => {
        setSelectedOptions(prev => {
            const filtered = prev.filter(o => o.optionId !== optionId);
            return [...filtered, {
                optionId,
                valueId: value.id,
                optionName,
                optionValue: value.label,
                priceAdjust: value.priceAdjust
            }];
        });
    };

    const calculateItemPrice = () => {
        const basePrice = menu.price;
        const optionsAdjust = selectedOptions.reduce((acc, curr) => acc + curr.priceAdjust, 0);
        return (basePrice + optionsAdjust) * quantity;
    };

    const handleAddToCart = () => {
        // Validate required options
        const missingOptions = menu.menuOptions.filter(
            (opt) => opt.isRequired && !selectedOptions.find(so => so.optionId === opt.id)
        );

        if (missingOptions.length > 0) {
            toast.error(`Mohon pilih ${missingOptions[0].name} dulu ya!`, {
                style: { background: '#333', color: '#fff', border: '1px solid #222' }
            });
            return;
        }

        addItem({
            id: menu.id,
            name: menu.name,
            price: menu.price,
            quantity,
            imageUrl: menu.imageUrl || undefined,
            notes,
            selectedOptions,
        });

        toast.success(`${menu.name} masuk keranjang! ✨`);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[calc(100vw-32px)] max-w-sm p-0 overflow-hidden border-none rounded-[2rem] bg-zinc-950/90 backdrop-blur-xl shadow-2xl">
                {/* Header Image */}
                <div className="h-48 relative overflow-hidden group">
                    {menu.imageUrl ? (
                        <img src={menu.imageUrl} alt={menu.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 font-black bg-zinc-900/50">
                            <div className="text-4xl opacity-20 mb-2">☕</div>
                            <span className="text-xs tracking-[0.2em] opacity-40">GONKU</span>
                        </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent">
                        <DialogHeader className="text-left space-y-1">
                            <DialogTitle className="text-2xl font-black text-white leading-none tracking-tight truncate pr-4">
                                {menu.name}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="mt-2">
                            <MenuHighlightBadge highlightType={menu.highlightType} className="border-none px-2 py-1" />
                        </div>
                        <p className="text-zinc-400 text-xs font-medium leading-relaxed line-clamp-2 max-w-[95%]">
                            {menu.description || "Rasakan cita rasa otentik khas Cafe Gonku."}
                        </p>
                    </div>
                </div>

                <div className="px-6 pb-6 pt-2 space-y-6 max-h-[50vh] overflow-y-auto no-scrollbar">
                    {/* Options */}
                    {menu.menuOptions.map((option) => (
                        <div key={option.id} className="space-y-3 animate-in slide-in-from-bottom-5 duration-500">
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-sm text-white tracking-wide">{option.name}</h4>
                                {option.isRequired ? (
                                    <Badge className="bg-primary text-black hover:bg-primary border-none text-[9px] uppercase font-black px-1.5 h-4 tracking-widest shadow-[0_0_10px_rgba(46,254,60,0.4)]">Wajib</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-zinc-500 border-zinc-800 text-[9px] uppercase font-bold px-1.5 h-4 tracking-widest">Optional</Badge>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {option.values.map((val) => {
                                    const isSelected = selectedOptions.find(so => so.optionId === option.id && so.valueId === val.id);
                                    return (
                                        <button
                                            key={val.id}
                                            onClick={() => handleOptionSelect(option.id, option.name, val)}
                                            className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all duration-500 relative overflow-hidden group/btn ${isSelected
                                                ? "bg-primary text-black border-primary shadow-[0_0_20px_rgba(46,254,60,0.3)] scale-105 z-10"
                                                : "bg-zinc-900/40 border-white/5 text-zinc-500 hover:border-white/20 hover:bg-zinc-800 hover:text-white"
                                                }`}
                                        >
                                            <span className="relative z-10 flex items-center gap-2">
                                                {val.label}
                                                {val.priceAdjust > 0 && <span className="opacity-60 text-[10px]">+{(val.priceAdjust / 1000)}k</span>}
                                            </span>
                                            {isSelected && <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Notes */}
                    <div className="space-y-2">
                        <h4 className="font-bold text-sm text-white">Catatan (Optional)</h4>
                        <Textarea
                            placeholder="Contoh: Nggak pake bawang ya bang..."
                            className="bg-zinc-900/50 border-white/5 rounded-xl min-h-[80px] text-sm focus-visible:ring-primary/20 placeholder:text-zinc-600 transition-all hover:bg-zinc-900 resize-none p-3"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer / Add to Cart Section */}
                <DialogFooter className="p-5 bg-zinc-950 border-t border-white/5 flex-row items-center justify-between gap-3 relative z-20">
                    {menu.isAvailable ? (
                        <>
                            <div className="flex items-center bg-zinc-900/50 rounded-xl border border-white/5 p-1 backdrop-blur-sm">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </Button>
                                <span className="w-8 text-center text-sm font-black text-white tabular-nums">
                                    {quantity}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-primary hover:text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-75"
                                    onClick={() => setQuantity(quantity + 1)}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>

                            <Button
                                className="flex-1 h-12 bg-primary hover:bg-primary/90 text-black font-black text-sm rounded-xl shadow-[0_8px_25px_rgba(46,254,60,0.15)] hover:shadow-[0_12px_35px_rgba(46,254,60,0.25)] transition-all active:scale-95 flex items-center justify-between px-5 group"
                                onClick={handleAddToCart}
                            >
                                <span className="uppercase tracking-widest text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">Tambah</span>
                                <span className="flex items-center gap-2">
                                    Rp {calculateItemPrice().toLocaleString("id-ID")}
                                    <ShoppingCart className="w-4 h-4 fill-black/20" />
                                </span>
                            </Button>
                        </>
                    ) : (
                        <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                            <p className="text-red-500 font-bold text-sm">Maaf, menu ini sedang habis :(</p>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

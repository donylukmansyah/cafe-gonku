"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Loader2, Utensils, Coffee, Cookie, IceCream, LayoutGrid, Flame, Sparkles, XCircle, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Menu } from "@/types/menu";

interface MenuGridProps {
    menus: Menu[];
    isLoading?: boolean;
    onSelectItem: (menu: Menu) => void;
}

export function MenuGrid({ menus, isLoading = false, onSelectItem }: MenuGridProps) {
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Dynamic Categories based on available menus
    const categories = useMemo(() => {
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

    // FIX: Stabilize recommendations to prevent hydration mismatch (Server vs Client)
    const [recommendedMenus, setRecommendedMenus] = useState<Menu[]>([]);

    useEffect(() => {
        // Only run on client side after mount
        const shuffled = menus
            .filter(m => m.isAvailable)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
        setRecommendedMenus(shuffled);
    }, [menus]);

    if (isLoading) {
        return (
            <div className="space-y-6 pb-24 px-4 pt-2">
                {/* Search Skeleton */}
                <div className="sticky top-20 z-30 bg-zinc-950/90 backdrop-blur-xl pt-4 pb-4 -mx-4 px-4 border-b border-white/5">
                    <Skeleton className="h-11 w-full rounded-2xl bg-zinc-900" />
                    <div className="mt-3 flex gap-2 overflow-hidden">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-8 w-20 rounded-full bg-zinc-900 flex-shrink-0" />
                        ))}
                    </div>
                </div>
                {/* Grid Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col h-full">
                            <Skeleton className="aspect-[4/3] w-full bg-zinc-900" />
                            <div className="p-3 flex flex-col gap-2 flex-1">
                                <Skeleton className="h-4 w-3/4 bg-zinc-900" />
                                <Skeleton className="h-3 w-1/2 bg-zinc-900 mt-auto" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 pt-2">
            {/* Search & Categories Fixed Header */}
            <div className="sticky top-20 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-zinc-950/50">
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

            {/* Content Container */}
            <div className="px-5">

                {/* Recommended Section */}
                {activeCategory === "ALL" && !searchQuery && recommendedMenus.length > 0 && (
                    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-700 overflow-visible">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-black text-white flex items-center gap-2.5 tracking-tight px-1">
                                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-inner">
                                    <Flame className="w-4 h-4 text-orange-500 fill-orange-500/20" />
                                </div>
                                Rekomendasi
                            </h2>
                        </div>
                        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6 pt-2 snap-x -mx-5 px-5">
                            {recommendedMenus.map((menu) => (
                                <div
                                    key={`rec-${menu.id}`}
                                    className="min-w-[300px] bg-zinc-900 border border-white/5 rounded-3xl p-5 flex gap-5 items-center relative overflow-hidden group cursor-pointer snap-center hover:bg-zinc-900 hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 ease-out shadow-[0_12px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_40px_rgba(46,254,60,0.08)] active:scale-95 translate-z-0"
                                    onClick={() => onSelectItem(menu)}
                                >
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-zinc-950 shadow-inner relative border border-white/5">
                                        {menu.imageUrl ? (
                                            <img src={menu.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" alt={menu.name} />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center font-black text-[9px] tracking-widest opacity-20 italic text-zinc-400">GONKU</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 z-10">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Sparkles className="w-3 h-3 text-amber-500" />
                                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none">Best Seller</span>
                                        </div>
                                        <h3 className="font-black text-white text-[17px] truncate tracking-tight mb-1 group-hover:text-primary transition-colors">{menu.name}</h3>
                                        <div className="flex items-center justify-between">
                                            <div className="text-white font-black text-lg flex items-center gap-1">
                                                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-tighter">Rp</span>
                                                {menu.price.toLocaleString("id-ID")}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section Title */}
                <div className="mb-6 mt-2 flex items-center justify-between">
                    <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-primary rounded-full" />
                        {searchQuery ? (
                            <span>Hasil Pencarian</span>
                        ) : (
                            <span className="capitalize">{activeCategory === "ALL" ? "Semua" : activeCategory.toLowerCase()} Menu</span>
                        )}
                        {searchQuery && (
                            <span className="text-zinc-500 font-bold text-sm tracking-normal">"{searchQuery}"</span>
                        )}
                    </h2>
                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">{filteredMenus.length} items</span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-visible pt-1 px-0.5">
                    {filteredMenus.map((menu) => (
                        <MenuCard key={menu.id} menu={menu} onClick={() => onSelectItem(menu)} />
                    ))}
                </div>

                {filteredMenus.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-700 border border-white/5 font-black italic">
                            ?
                        </div>
                        <p className="text-zinc-500 text-sm">Yah, menu yang kamu cari nggak ada...</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function MenuCard({ menu, onClick }: { menu: Menu; onClick: () => void }) {
    const [isImageLoading, setIsImageLoading] = useState(true);

    return (
        <div
            className="group relative bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden flex flex-col hover:bg-zinc-900 hover:border-primary/20 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 ease-out shadow-[0_10px_25px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_40px_rgba(46,254,60,0.08)] cursor-pointer animate-in fade-in zoom-in-95 translate-z-0"
            onClick={onClick}
        >
            <div className="aspect-square relative bg-zinc-950 overflow-hidden">
                {menu.imageUrl && (
                    <>
                        {isImageLoading && <Skeleton className="absolute inset-0 w-full h-full bg-zinc-950 animate-pulse" />}
                        <img
                            src={menu.imageUrl}
                            alt={menu.name}
                            className={cn(
                                "w-full h-full object-cover transition-all duration-500 ease-out",
                                isImageLoading ? "opacity-0" : "opacity-100",
                                menu.isAvailable ? "group-hover:scale-105" : "grayscale opacity-20 contrast-125"
                            )}
                            onLoad={() => setIsImageLoading(false)}
                        />
                    </>
                )}
                {!menu.imageUrl && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-800 font-black bg-zinc-950 shadow-inner">
                        <span className="text-[10px] tracking-[0.3em] opacity-10">GONKU</span>
                    </div>
                )}

                {/* Modern Gradient Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                <div className={cn(
                    "absolute bottom-4 right-4 w-10 h-10 backdrop-blur-2xl border border-white/10 rounded-xl flex items-center justify-center text-white shadow-2xl transition-all duration-300 ease-out z-20 overflow-hidden",
                    menu.isAvailable
                        ? "bg-primary text-black hover:scale-105 active:scale-90 shadow-[0_8px_20px_rgba(46,254,60,0.15)] group-hover:bg-primary/90"
                        : "bg-zinc-900/80 text-zinc-700 cursor-not-allowed border-none shadow-none"
                )}>
                    {menu.isAvailable ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <Plus className="w-5 h-5 transition-transform duration-500 group-hover:rotate-90" />
                        </div>
                    ) : (
                        <XCircle className="w-4 h-4 opacity-30" />
                    )}
                </div>

                {!menu.isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px] z-10 transition-all duration-500">
                        <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-90 duration-300">
                            <div className="w-10 h-10 rounded-xl bg-zinc-950/80 backdrop-blur-xl border border-red-500/20 flex items-center justify-center shadow-xl">
                                <XCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <span className="text-white font-black text-[9px] uppercase tracking-[0.3em] bg-red-600/10 px-2.5 py-1 rounded-full border border-red-500/20 shadow-sm">Habis</span>
                        </div>
                    </div>
                )}
            </div>
            <div className="p-5 flex flex-col flex-1 relative bg-zinc-900/30">
                <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-500 font-black text-[9px] uppercase tracking-[0.2em] mb-1">
                        {menu.category}
                    </span>
                    <h3 className={cn(
                        "text-[16px] font-black leading-tight transition-all duration-300 tracking-tight",
                        menu.isAvailable ? "text-white" : "text-zinc-700"
                    )}>
                        {menu.name}
                    </h3>
                    <div className="mt-2.5 text-white font-black text-base flex items-center gap-1">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Rp</span>
                        {menu.price.toLocaleString("id-ID")}
                    </div>
                </div>
            </div>
        </div>
    );
}

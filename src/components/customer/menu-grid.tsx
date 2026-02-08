"use client";

import { useState, useMemo } from "react";
import { Menu } from "@/hooks/use-customer-menus";
import { Plus, Search, Loader2, Utensils, Coffee, Cookie, IceCream, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

    if (isLoading) {
        return (
            <div className="space-y-6 pb-24 px-4 pt-2">
                {/* Search Skeleton */}
                <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl pt-4 pb-4 -mx-4 px-4 border-b border-white/5">
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
            <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-zinc-950/50">
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

                {/* Recommended Section (Client-side Mock) */}
                {activeCategory === "ALL" && !searchQuery && filteredMenus.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                            🔥 Rekomendasi Chef
                        </h2>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x">
                            {filteredMenus
                                .filter(m => m.isAvailable) // Only recommend available items
                                .sort(() => 0.5 - Math.random()) // Shuffle
                                .slice(0, 3) // Take 3
                                .map((menu) => (
                                    <div
                                        key={menu.id}
                                        className="min-w-[280px] bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-4 flex gap-4 items-center relative overflow-hidden group cursor-pointer snap-center"
                                        onClick={() => onSelectItem(menu)}
                                    >
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-zinc-800">
                                            {menu.imageUrl ? (
                                                <img src={menu.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={menu.name} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-lg">☕</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/20 text-[9px] mb-1 px-1.5 h-4">BEST SELLER</Badge>
                                            <h3 className="font-bold text-white text-sm truncate">{menu.name}</h3>
                                            <p className="text-zinc-500 text-xs truncate mb-1">{menu.category}</p>
                                            <div className="text-primary font-black text-sm">Rp {menu.price.toLocaleString("id-ID")}</div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
            className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col group active:scale-95 transition-all relative hover:border-primary/20 hover:bg-zinc-900/60 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] duration-500 cursor-pointer"
            onClick={onClick}
        >
            <div className="aspect-[4/3] relative bg-zinc-800 overflow-hidden">
                {menu.imageUrl && (
                    <>
                        {isImageLoading && <Skeleton className="absolute inset-0 w-full h-full bg-zinc-800 animate-pulse" />}
                        <img
                            src={menu.imageUrl}
                            alt={menu.name}
                            className={cn(
                                "w-full h-full object-cover transition-all duration-700",
                                isImageLoading ? "opacity-0" : "opacity-100",
                                menu.isAvailable ? "group-hover:scale-110" : "grayscale opacity-50 contrast-125"
                            )}
                            onLoad={() => setIsImageLoading(false)}
                        />
                    </>
                )}
                {!menu.imageUrl && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 font-black bg-zinc-900/50">
                        <div className="text-3xl opacity-20 mb-1">☕</div>
                        <span className="text-[10px] tracking-widest opacity-40">GONKU</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                <button
                    disabled={!menu.isAvailable}
                    className={cn(
                        "absolute bottom-2 right-2 w-8 h-8 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300",
                        menu.isAvailable
                            ? "bg-white/10 group-hover:bg-primary group-hover:text-black group-hover:scale-110"
                            : "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                    )}
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            <div className="p-4 flex flex-col flex-1 relative">
                <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className={cn(
                        "text-sm font-bold truncate leading-snug transition-colors duration-300",
                        menu.isAvailable ? "text-white group-hover:text-primary" : "text-zinc-500"
                    )}>
                        {menu.name}
                    </h3>
                    {!menu.isAvailable && (
                        <span className="text-[9px] font-black bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-wider whitespace-nowrap">
                            Habis
                        </span>
                    )}
                </div>
                <div className="mt-auto flex flex-col gap-0.5">
                    <span className="text-zinc-500 font-medium text-[10px] uppercase tracking-wider">
                        {menu.category}
                    </span>
                    <span className="text-white font-black text-sm tracking-tight group-hover:text-primary transition-colors duration-300">
                        Rp {menu.price.toLocaleString("id-ID")}
                    </span>
                </div>
            </div>
        </div>
    );
}

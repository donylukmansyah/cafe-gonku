"use client";

import { useState } from "react";
import { Plus, Flame, Sparkles, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/shared/utils";
import { Menu } from "@/features/menus/types";
import { MenuHighlightBadge } from "@/features/menus/components/menu-highlight-badge";
import { MENU_HIGHLIGHT_META, isHighlightedMenu } from "@/features/menus/menu-highlight";
import { normalizeImageUrl } from "@/features/menus/image-url";

interface MenuGridProps {
    menus: Menu[]; // Filtered menus
    searchQuery: string;
    activeCategory: string; // Needed for display logic
    onSelectItem: (menu: Menu) => void;
    // We pass allMenus if we want to handle recommendation logic here, 
    // OR we can move recommendation logic effectively to parent.
    // Let's keep recommendation logic here for now, but we need the FULL list for it.
    allMenus: Menu[];
    isLoading?: boolean;
}

export function MenuGrid({ menus, allMenus, searchQuery, activeCategory, isLoading = false, onSelectItem }: MenuGridProps) {
    const highlightedMenus = allMenus
        .filter((menu) => menu.isAvailable && isHighlightedMenu(menu.highlightType))
        .sort((a, b) => {
            const orderDiff = MENU_HIGHLIGHT_META[a.highlightType].order - MENU_HIGHLIGHT_META[b.highlightType].order;
            if (orderDiff !== 0) return orderDiff;
            return a.name.localeCompare(b.name);
        });

    const featuredMenus = highlightedMenus.slice(0, 3);

    if (isLoading) {
        return <MenuGridSkeleton />;
    }

    return (
        <div className="space-y-6 pb-10 pt-2">
            {/* Header moved to parent */}

            {/* Content Container */}
            <div className="px-5">

                {/* Highlighted Section */}
                {activeCategory === "ALL" && !searchQuery && featuredMenus.length > 0 && (
                    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-700 overflow-visible">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-black text-white flex items-center gap-2.5 tracking-tight px-1">
                                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-inner">
                                    <Flame className="w-4 h-4 text-orange-500 fill-orange-500/20" />
                                </div>
                                Menu Unggulan
                            </h2>
                        </div>
                        <div className="flex gap-5 overflow-x-auto scrollbar-hidden pb-6 pt-2 snap-x -mx-5 px-5">
                            {featuredMenus.map((menu) => (
                                <div
                                    key={`rec-${menu.id}`}
                                    className="min-w-[300px] bg-[#19191B] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 flex gap-5 items-center relative overflow-hidden group cursor-pointer snap-center hover:bg-[#1F1F21] hover:border-primary/25 hover:-translate-y-1 transition-all duration-300 ease-out shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_45px_rgba(0,0,0,0.28)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_22px_55px_rgba(53,183,24,0.10)] active:scale-95 translate-z-0"
                                    onClick={() => onSelectItem(menu)}
                                >
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-[#19191B] shadow-inner relative border border-white/10">
                                        {normalizeImageUrl(menu.imageUrl) ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={normalizeImageUrl(menu.imageUrl)!}
                                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                                alt={menu.name}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center font-black text-[9px] tracking-widest opacity-20 italic text-zinc-400">GONKU</div>
                                        )}

                                    </div>
                                    <div className="flex-1 min-w-0 z-10">
                                        <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase leading-none tracking-widest text-amber-400/90">
                                            <Sparkles className="h-3 w-3" />
                                            <span>{MENU_HIGHLIGHT_META[menu.highlightType].label}</span>
                                        </div>
                                        <h3 className="font-black text-white text-[17px] line-clamp-2 leading-tight tracking-tight mb-1 group-hover:text-primary transition-colors">{menu.name}</h3>
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
                    </h2>
                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">{menus.length} items</span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-visible pt-1 px-0.5">
                    {menus.map((menu) => (
                        <MenuCard key={menu.id} menu={menu} onClick={() => onSelectItem(menu)} />
                    ))}
                </div>

                {menus.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-700 border border-white/5 font-black italic">
                            ?
                        </div>
                        <p className="text-zinc-500 text-sm">Yah, menu yang kamu cari tidak ada...</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function MenuGridSkeleton() {
    return (
        <div className="space-y-6 pb-10 pt-2">
            <div className="px-5">
                <div className="mb-6 mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-1.5 h-6 rounded-full bg-primary/30" />
                        <Skeleton className="h-6 w-32 rounded-lg bg-zinc-800" />
                    </div>
                    <Skeleton className="h-4 w-16 rounded bg-zinc-800" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-visible pt-1 px-0.5">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={index}
                            className="relative bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-[0_10px_25px_rgba(0,0,0,0.2)] animate-pulse"
                        >
                            <div className="aspect-square relative bg-zinc-950 overflow-hidden">
                                <Skeleton className="absolute inset-0 w-full h-full bg-zinc-800/70" />
                                <Skeleton className="absolute top-3 left-3 h-6 w-16 rounded-full bg-zinc-700/70" />
                                <Skeleton className="absolute bottom-4 right-4 w-10 h-10 rounded-xl bg-zinc-700/70" />
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            </div>
                            <div className="p-5 flex flex-col flex-1 bg-zinc-900/30 space-y-3">
                                <Skeleton className="h-3 w-14 rounded bg-zinc-800" />
                                <Skeleton className="h-5 w-4/5 rounded bg-zinc-800" />
                                <Skeleton className="h-5 w-24 rounded bg-zinc-800" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MenuCard({ menu, onClick }: { menu: Menu; onClick: () => void }) {
    const [imageError, setImageError] = useState(false);
    const imageUrl = normalizeImageUrl(menu.imageUrl);
    const shouldShowImage = Boolean(imageUrl && !imageError);

    return (
        <div
            className="group relative bg-[#19191B] backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden flex flex-col hover:bg-[#1F1F21] hover:border-primary/25 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 ease-out shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_35px_rgba(0,0,0,0.24)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(53,183,24,0.10)] cursor-pointer animate-in fade-in zoom-in-95 translate-z-0"
            onClick={onClick}
        >
            <div className="aspect-square relative bg-zinc-950 overflow-hidden">
                {shouldShowImage && (
                    // Keep image visible by default. Cached browser images can complete before React onLoad runs after refresh,
                    // so opacity-gated loading state can leave cards permanently black until remount/filter change.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl!}
                        alt={menu.name}
                        className={cn(
                            "h-full w-full object-cover transition-all duration-500 ease-out",
                            menu.isAvailable ? "group-hover:scale-105" : "grayscale opacity-20 contrast-125"
                        )}
                        onError={() => setImageError(true)}
                    />
                )}
                {!shouldShowImage && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 font-black bg-[#19191B] shadow-inner">
                        <span className="text-[10px] tracking-[0.3em] opacity-10">GONKU</span>
                    </div>
                )}

                {/* Modern Gradient Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                <div className="absolute top-3 left-3 z-20">
                    <MenuHighlightBadge
                        highlightType={menu.highlightType}
                        compact
                        className="h-6 rounded-full px-2.5 py-0 text-[9px] tracking-wider"
                    />
                </div>

                <div className={cn(
                    "absolute bottom-4 right-4 w-10 h-10 backdrop-blur-2xl border border-white/10 rounded-xl flex items-center justify-center text-white shadow-2xl transition-all duration-300 ease-out z-20 overflow-hidden",
                    menu.isAvailable
                        ? "bg-primary text-black hover:scale-105 active:scale-90 shadow-[0_8px_20px_rgba(53,183,24,0.15)] group-hover:bg-primary/90"
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
            <div className="p-5 flex flex-col flex-1 relative bg-[#19191B] border-t border-white/[0.06]">
                <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-500 font-black text-[9px] uppercase tracking-[0.2em] mb-1">
                        {menu.category}
                    </span>
                    <h3 className={cn(
                        "text-[16px] font-black leading-tight transition-all duration-300 tracking-tight line-clamp-2 min-h-[2.5rem]",
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

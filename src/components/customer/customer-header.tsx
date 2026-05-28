import { Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";

interface Category {
    id: string;
    label: string;
    icon: React.ElementType;
}

interface CustomerHeaderProps {
    tableNumber: number;
    itemCount: number;
    onOpenCart: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    categories: Category[];
    activeCategory: string;
    onCategoryChange: (category: string) => void;
}

export function CustomerHeader({
    tableNumber,
    itemCount,
    onOpenCart,
    searchQuery,
    onSearchChange,
    categories,
    activeCategory,
    onCategoryChange
}: CustomerHeaderProps) {
    return (
        <>
            {/* Header */}
            <div className="h-20 px-6 flex items-center justify-between bg-zinc-950/80">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2 group">
                        GON<span className="text-primary italic group-hover:skew-x-12 transition-transform">KU</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(53,183,24,0.8)]" />
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5 opacity-80 group cursor-default">
                        <div className="w-2 h-2 rounded-full bg-primary/20 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(53,183,24,0.5)]" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-primary transition-colors">
                            TABLE <span className="text-white">#{tableNumber}</span>
                        </span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="relative bg-zinc-900/80 border border-white/5 rounded-2xl w-12 h-12 hover:bg-primary/20 hover:text-primary transition-all shadow-lg active:scale-90"
                    onClick={onOpenCart}
                >
                    <ShoppingCart className="w-5 h-5 text-zinc-300" />
                    {itemCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-black text-[10px] font-black rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(53,183,24,0.4)] border-2 border-zinc-950 animate-in zoom-in duration-300">
                            {itemCount}
                        </span>
                    )}
                </Button>
            </div>

            {/* Separator inside container */}
            <div className="h-[1px] bg-white/5 w-full" />

            {/* Search & Categories */}
            <div className="sticky top-0 z-40 px-5 pt-4 pb-4 space-y-4 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 shadow-[0_18px_35px_rgba(0,0,0,0.35)] transition-all duration-300 transform-gpu">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder="Cari menu favoritmu..."
                        className="pl-11 h-12 bg-zinc-900 border-white/5 rounded-2xl focus-visible:ring-primary/20 text-sm placeholder:text-zinc-600 w-full font-medium"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                {/* Categories */}
                <div className="w-full overflow-hidden">
                    <div className="flex overflow-x-auto scrollbar-hidden gap-3 pb-1 snap-x">
                        <Tabs value={activeCategory} onValueChange={onCategoryChange} className="w-full">
                            <TabsList className="bg-transparent h-auto p-0 flex gap-3 w-max">
                                {categories.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <TabsTrigger
                                            key={cat.id}
                                            value={cat.id}
                                            onClick={(e) => {
                                                onCategoryChange(cat.id);
                                                e.currentTarget.scrollIntoView({
                                                    behavior: "smooth",
                                                    block: "nearest",
                                                    inline: "center",
                                                });
                                            }}
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
        </>
    );
}

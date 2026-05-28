"use client";

import { useState, memo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    UtensilsCrossed,
    Coffee,
    Cookie,
    IceCream,
    Search,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Menu {
    id: string;
    name: string;
    category: "FOOD" | "DRINK" | "SNACK" | "DESSERT";
    price: number;
    imageUrl: string | null;
    isAvailable: boolean;
}

interface MenuAvailabilityProps {
    menus: Menu[];
    groupedMenus: Record<string, Menu[]>;
    onToggle: (menuId: string, isAvailable: boolean) => Promise<boolean>;
    isLoading: boolean;
}

// Different colors for each category (matching status colors)
const categoryConfig = {
    FOOD: {
        icon: UtensilsCrossed,
        label: "Makanan",
        iconBg: "bg-amber-500/20",
        iconColor: "text-amber-400",
        dotActive: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]",
    },
    DRINK: {
        icon: Coffee,
        label: "Minuman",
        iconBg: "bg-blue-500/20",
        iconColor: "text-blue-400",
        dotActive: "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)]",
    },
    SNACK: {
        icon: Cookie,
        label: "Cemilan",
        iconBg: "bg-orange-500/20",
        iconColor: "text-orange-400",
        dotActive: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.4)]",
    },
    DESSERT: {
        icon: IceCream,
        label: "Dessert",
        iconBg: "bg-pink-500/20",
        iconColor: "text-pink-400",
        dotActive: "bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.4)]",
    },
};

// Memoized Menu Item Component to prevent re-renders
const MenuItem = memo(function MenuItem({
    menu,
    categoryDotClass,
    isUpdating,
    onToggle,
}: {
    menu: Menu;
    categoryDotClass: string;
    isUpdating: boolean;
    onToggle: (menu: Menu) => void;
}) {
    return (
        <div
            className={`flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 border ${menu.isAvailable
                ? "bg-zinc-900/40 border-white/[0.03] hover:border-primary/20"
                : "bg-red-500/[0.03] border-red-500/20 opacity-80"
                }`}
        >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div
                    className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${menu.isAvailable ? `${categoryDotClass} animate-pulse-slow` : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                        }`}
                />
                <div className="flex-1 min-w-0">
                    <span
                        className={`font-bold text-[13px] tracking-tight transition-all duration-300 block ${menu.isAvailable ? "text-white" : "text-zinc-500"
                            }`}
                    >
                        {menu.name}
                    </span>
                    <span className="text-[10px] font-medium text-zinc-500/80">
                        Rp {menu.price.toLocaleString("id-ID")}
                    </span>
                </div>
            </div>
            <Switch
                checked={menu.isAvailable}
                onCheckedChange={() => onToggle(menu)}
                disabled={isUpdating}
                className="data-[state=checked]:bg-emerald-500/40 data-[state=checked]:border-primary/50 border-white/5 bg-zinc-800 h-5 w-9 cursor-pointer transition-all"
            />
        </div>
    );
});

// Memoized Category Card Component
const CategoryCard = memo(function CategoryCard({
    category,
    categoryMenus,
    updatingIds,
    onToggle,
}: {
    category: string;
    categoryMenus: Menu[];
    updatingIds: Set<string>;
    onToggle: (menu: Menu) => void;
}) {
    const config = categoryConfig[category as keyof typeof categoryConfig];
    const Icon = config.icon;

    return (
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-800">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 ${config.iconBg} rounded-lg flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${config.iconColor}`} />
                        </div>
                        <div>
                            <span className="text-base font-bold text-white">{config.label}</span>
                            <p className="text-xs text-zinc-500">{categoryMenus.length} item</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-500">
                        {categoryMenus.filter((m) => m.isAvailable).length}/{categoryMenus.length}
                    </Badge>
                </CardTitle>
            </CardHeader>

            <CardContent className="pt-3 space-y-2 max-h-[350px] overflow-y-auto scrollbar-hidden">
                {categoryMenus.map((menu) => (
                    <MenuItem
                        key={menu.id}
                        menu={menu}
                        categoryDotClass={config.dotActive}
                        isUpdating={updatingIds.has(menu.id)}
                        onToggle={onToggle}
                    />
                ))}
            </CardContent>
        </Card>
    );
});

export function MenuAvailability({
    menus,
    groupedMenus,
    onToggle,
    isLoading,
}: MenuAvailabilityProps) {
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");

    // Memoized toggle handler
    const handleToggle = useCallback(async (menu: Menu) => {
        const newAvailability = !menu.isAvailable;
        setUpdatingIds((prev) => new Set(prev).add(menu.id));

        try {
            await onToggle(menu.id, newAvailability);
            toast.success(
                <div className="flex items-center gap-2">
                    {newAvailability ? (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span>
                        <strong>{menu.name}</strong> sekarang{" "}
                        {newAvailability ? "tersedia" : "tidak tersedia"}
                    </span>
                </div>
            );
        } catch {
            toast.error("Gagal mengubah status menu");
        } finally {
            setUpdatingIds((prev) => {
                const next = new Set(prev);
                next.delete(menu.id);
                return next;
            });
        }
    }, [onToggle]);

    // Filter menus by search (memoized result)
    const filteredGroupedMenus = Object.entries(groupedMenus).reduce(
        (acc, [category, items]) => {
            const filtered = searchQuery
                ? items.filter((menu) =>
                    menu.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                : items;
            if (filtered.length > 0) {
                acc[category] = filtered;
            }
            return acc;
        },
        {} as Record<string, Menu[]>
    );

    // Stats
    const availableCount = menus.filter((m) => m.isAvailable).length;
    const unavailableCount = menus.length - availableCount;

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                    <Card key={i} className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-4">
                            <Skeleton className="h-6 w-40 bg-zinc-800" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[1, 2, 3, 4].map((j) => (
                                <Skeleton key={j} className="h-14 w-full bg-zinc-800" />
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(53,183,24,0.05)]">
                        <UtensilsCrossed className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight">Status Menu</h2>
                        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.2em]">Ketersediaan Katalog</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30 border font-bold">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {availableCount}
                        </Badge>
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border font-bold">
                            <XCircle className="w-3 h-3 mr-1" />
                            {unavailableCount}
                        </Badge>
                    </div>
                    {/* Search */}
                    <div className="relative flex-1 sm:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                            placeholder="Cari menu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 rounded-lg"
                        />
                    </div>
                </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {Object.entries(filteredGroupedMenus).map(([category, categoryMenus]) => (
                    <CategoryCard
                        key={category}
                        category={category}
                        categoryMenus={categoryMenus}
                        updatingIds={updatingIds}
                        onToggle={handleToggle}
                    />
                ))}
            </div>
        </div>
    );
}

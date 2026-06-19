"use client";

import { memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Menu } from "@/types/menu";
import { MenuHighlightBadge } from "@/components/menu-highlight-badge";
import { normalizeImageUrl } from "@/lib/image-url";

interface MenuCardProps {
    menu: Menu;
    onDelete: (id: string) => void;
    onToggleAvailability: (id: string, current: boolean) => void;
}

export const MenuCard = memo(function MenuCard({
    menu,
    onDelete,
    onToggleAvailability,
}: MenuCardProps) {
    const [imageError, setImageError] = useState(false);
    const imageUrl = normalizeImageUrl(menu.imageUrl);

    return (
        <Card className="bg-zinc-900/50 border-white/5 overflow-hidden group hover:border-primary/20 transition-all backdrop-blur-sm">
            <div className="aspect-square relative overflow-hidden bg-zinc-800">
                {imageUrl && !imageError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl}
                        alt={menu.name}
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <span className="font-black text-4xl italic">GONKU</span>
                    </div>
                )}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-9 w-9 bg-black/60 backdrop-blur-md border border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                        asChild
                    >
                        <Link href={`/owner/menus/${menu.id}/edit`}>
                            <Edit className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button
                        size="icon"
                        variant="destructive"
                        className="h-9 w-9 bg-red-500/20 backdrop-blur-md border border-red-500/20 hover:bg-red-500/30 hover:text-red-500 rounded-xl transition-all"
                        onClick={() => onDelete(menu.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                {!menu.isActive && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                        <Badge variant="destructive" className="font-black uppercase tracking-[0.2em] px-4 py-1">Inactive</Badge>
                    </div>
                )}
            </div>

            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-black">
                            {menu.category}
                        </Badge>
                        <MenuHighlightBadge highlightType={menu.highlightType} />
                    </div>
                    <span className="text-primary font-black">
                        Rp {menu.price.toLocaleString("id-ID")}
                    </span>
                </div>
                <h3 className="font-bold text-white text-lg truncate group-hover:text-primary transition-colors">
                    {menu.name}
                </h3>
                <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${menu.isAvailable ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                            {menu.isAvailable ? 'In Stock' : 'Out of Stock'}
                        </span>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all rounded-lg"
                        onClick={() => onToggleAvailability(menu.id, menu.isAvailable)}
                    >
                        Toggle
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
});

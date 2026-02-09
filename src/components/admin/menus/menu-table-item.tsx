"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Edit, Trash2, CameraOff } from "lucide-react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Menu } from "@/hooks/use-admin-menus";

interface MenuTableItemProps {
    menu: Menu;
    onDelete: (id: string) => void;
    onToggleAvailability: (id: string, current: boolean) => void;
}

export const MenuTableItem = memo(function MenuTableItem({
    menu,
    onDelete,
    onToggleAvailability,
}: MenuTableItemProps) {
    return (
        <TableRow className="border-white/5 hover:bg-white/[0.02] transition-colors group">
            <TableCell className="py-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/5 overflow-hidden flex items-center justify-center relative">
                        {menu.imageUrl ? (
                            <img src={menu.imageUrl} alt={menu.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                            <CameraOff className="w-5 h-5 text-zinc-600" />
                        )}
                        {!menu.isActive && (
                            <div className="absolute inset-0 bg-red-500/40 backdrop-blur-[1px]" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover:text-primary transition-colors">{menu.name}</span>
                            {typeof menu.isActive !== 'undefined' && !menu.isActive && (
                                <Badge variant="destructive" className="text-[8px] h-4 px-1 uppercase tracking-tighter">Archived</Badge>
                            )}
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="outline" className="text-[10px] uppercase font-black text-zinc-400 border-zinc-800 group-hover:border-primary/30 transition-colors">
                    {menu.category}
                </Badge>
            </TableCell>
            <TableCell>
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${menu.isAvailable ? 'bg-emerald-500 animate-pulse-slow' : 'bg-red-500'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${menu.isAvailable ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                            {menu.isAvailable ? 'In Stock' : 'Out Stock'}
                        </span>
                    </div>
                    <Switch
                        checked={menu.isAvailable}
                        onCheckedChange={() => onToggleAvailability(menu.id, menu.isAvailable)}
                        className="h-4 w-8 data-[state=checked]:bg-emerald-500/40 data-[state=checked]:border-emerald-500/50 border-white/5 bg-zinc-800"
                    />
                </div>
            </TableCell>
            <TableCell className="font-black text-white">
                Rp {menu.price.toLocaleString("id-ID")}
            </TableCell>
            <TableCell>
                <span className="text-xs text-zinc-500 font-medium">
                    {menu.menuOptions.length} Options
                </span>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                        asChild
                    >
                        <Link href={`/admin/menus/${menu.id}/edit`}>
                            <Edit className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
                        onClick={() => onDelete(menu.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
});

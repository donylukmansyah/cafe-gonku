"use client";

import { memo } from "react";
import type { Menu } from "@/features/menus/types";
import { MenuCard } from "./menu-card";
import { MenuTableItem } from "./menu-table-item";
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface MenuListProps {
    menus: Menu[];
    view: "grid" | "table";
    onDelete: (id: string) => void;
    onToggleAvailability: (id: string, current: boolean) => void;
}

export const MenuList = memo(function MenuList({
    menus,
    view,
    onDelete,
    onToggleAvailability,
}: MenuListProps) {
    if (menus.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 bg-zinc-900/30 border border-white/5 rounded-[2.5rem] backdrop-blur-sm">
                <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center border border-white/5 mb-6">
                    <span className="text-zinc-700 font-black text-2xl italic">OFF</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No menus found</h3>
                <p className="text-zinc-500">Coba sesuaikan filter pencarian Anda.</p>
            </div>
        );
    }

    if (view === "grid") {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {menus.map((menu) => (
                    <MenuCard
                        key={menu.id}
                        menu={menu}
                        onDelete={onDelete}
                        onToggleAvailability={onToggleAvailability}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden">
            <Table>
                <TableHeader className="bg-white/[0.03]">
                    <TableRow className="border-white/5 pointer-events-none">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-6 py-4">Menu Item</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Category</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Status</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Price</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Add-ons</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 px-6">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {menus.map((menu) => (
                        <MenuTableItem
                            key={menu.id}
                            menu={menu}
                            onDelete={onDelete}
                            onToggleAvailability={onToggleAvailability}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
});

"use client";

import { memo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TopMenusProps {
    menus: {
        name: string;
        quantity: number;
        category: string;
    }[];
}

export const TopMenus = memo(function TopMenus({ menus }: TopMenusProps) {
    if (menus.length === 0) {
        return (
            <Card className="bg-zinc-900 border-white/5 h-full flex items-center justify-center">
                <p className="text-zinc-500 italic">Belum ada data pesanan.</p>
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-900 border-white/5 h-full">
            <CardHeader>
                <CardTitle className="text-xl text-white">Popular Items</CardTitle>
                <CardDescription className="text-zinc-500">
                    Menu yang paling sering dipesan oleh customer.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {menus.map((menu, index) => (
                    <div key={menu.name} className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-sm font-black text-white group-hover:bg-primary group-hover:text-black transition-colors">
                            #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="font-bold text-white truncate">{menu.name}</h4>
                                <Badge variant="outline" className="text-[10px] uppercase font-black text-zinc-500 border-zinc-800">
                                    {menu.category}
                                </Badge>
                            </div>
                            <div className="mt-2 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-1000"
                                    style={{ width: `${(menu.quantity / menus[0].quantity) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-black text-white">{menu.quantity}</span>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Orders</p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
});

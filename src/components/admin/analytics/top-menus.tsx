"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UtensilsCrossed } from "lucide-react"

interface TopMenusProps {
    menus: {
        name: string
        quantity: number
        category: string
    }[]
}

export function TopMenus({ menus }: TopMenusProps) {
    return (
        <Card className="bg-zinc-900/40 backdrop-blur-sm border-white/5 shadow-2xl overflow-hidden h-full ring-1 ring-white/5">
            <CardHeader className="border-b border-white/[0.02] pb-6">
                <CardTitle className="text-white text-lg font-bold">Top Menu</CardTitle>
                <CardDescription className="text-zinc-500 text-sm">Produk yang paling digemari</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    {menus.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                            <UtensilsCrossed className="w-12 h-12 mb-4" />
                            <p className="text-sm font-medium">Belum ada data penjualan</p>
                        </div>
                    ) : (
                        menus.map((menu, index) => (
                            <div
                                key={index}
                                className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5 cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-10 h-10 font-black text-xs bg-zinc-800 border border-white/5 rounded-xl text-zinc-400 group-hover:text-primary transition-colors shadow-inner">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-bold text-zinc-200 group-hover:text-white transition-colors">{menu.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.1em] py-0 px-2 bg-black/40 border-white/5 text-zinc-500">
                                                {menu.category}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-white">{menu.quantity}</div>
                                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">Porsi</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

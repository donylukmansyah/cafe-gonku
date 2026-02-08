"use client"

import Image from "next/image"
import Link from "next/link"
import { Pencil, Trash2, MoreHorizontal, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Menu = {
    id: string
    name: string
    description: string | null
    price: number
    category: string
    imageUrl: string | null
    isAvailable: boolean
    isActive: boolean
    menuOptions: {
        id: string
        name: string
        values: { id: string; label: string; priceAdjust: number }[]
    }[]
}

const categoryColors: Record<string, string> = {
    FOOD: "bg-primary/10 text-primary border border-primary/20",
    DRINK: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    SNACK: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    DESSERT: "bg-pink-500/10 text-pink-400 border border-pink-500/20",
}

const categoryLabels: Record<string, string> = {
    FOOD: "Makanan",
    DRINK: "Minuman",
    SNACK: "Cemilan",
    DESSERT: "Dessert",
}

interface MenuCardProps {
    menu: Menu
    onDelete: (id: string) => void
}

export function MenuCard({ menu, onDelete }: MenuCardProps) {
    return (
        <div className={`group bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-5 hover:border-primary/20 transition-all duration-500 relative overflow-hidden ${!menu.isActive ? "opacity-50 grayscale" : ""}`}>
            <div className="flex gap-5">
                {/* Image Section */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-white/5 bg-zinc-800 shrink-0">
                    {menu.imageUrl ? (
                        <Image
                            src={menu.imageUrl}
                            alt={menu.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-1">
                            <ShoppingCart className="w-6 h-6 opacity-20" />
                            <span className="text-[8px] font-black uppercase tracking-widest">No Image</span>
                        </div>
                    )}
                    {!menu.isAvailable && menu.isActive && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest rotate-[-15deg] border-2 border-white px-2 py-0.5">Habis</span>
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className={`rounded-lg px-2 py-0 text-[9px] font-black uppercase tracking-widest border-0 ${categoryColors[menu.category]}`}>
                                {categoryLabels[menu.category]}
                            </Badge>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white/5 text-zinc-500 cursor-pointer">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-zinc-300 rounded-xl shadow-2xl">
                                    <DropdownMenuItem asChild className="rounded-lg focus:bg-primary/20 focus:text-primary cursor-pointer">
                                        <Link href={`/admin/menus/edit/${menu.id}`}>
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Edit Menu
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="rounded-lg text-red-400 focus:text-white focus:bg-red-500 cursor-pointer"
                                        onClick={() => onDelete(menu.id)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Hapus Menu
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <h3 className="font-black text-white text-lg tracking-tight truncate leading-tight">
                            {menu.name}
                        </h3>
                        {menu.description && (
                            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                                {menu.description}
                            </p>
                        )}
                    </div>

                    <div className="flex items-end justify-between mt-3">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest leading-none mb-1">Harga Satuan</span>
                            <span className="text-xl font-black text-primary flex items-baseline">
                                <span className="text-xs font-bold mr-0.5">Rp</span>
                                {menu.price.toLocaleString("id-ID")}
                            </span>
                        </div>
                        {menu.menuOptions.length > 0 && (
                            <div className="bg-white/[0.03] border border-white/5 rounded-lg px-2 py-1 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-primary" />
                                <span className="text-[9px] font-bold text-zinc-400 uppercase">{menu.menuOptions.length} Custom</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

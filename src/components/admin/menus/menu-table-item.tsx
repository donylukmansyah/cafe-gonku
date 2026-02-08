"use client"

import Image from "next/image"
import Link from "next/link"
import { Pencil, Trash2, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
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

interface MenuTableItemProps {
    menu: Menu
    onDelete: (id: string) => void
}

export function MenuTableItem({ menu, onDelete }: MenuTableItemProps) {
    return (
        <TableRow className={!menu.isActive ? "opacity-50" : ""}>
            <TableCell>
                <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden border border-white/5">
                    {menu.imageUrl ? (
                        <Image
                            src={menu.imageUrl}
                            alt={menu.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[10px] font-medium uppercase tracking-tighter">
                            No img
                        </div>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <div>
                    <p className="font-medium text-zinc-100">{menu.name}</p>
                    {menu.description && (
                        <p className="text-sm text-zinc-500 truncate max-w-[200px] sm:max-w-xs">
                            {menu.description}
                        </p>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="secondary" className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${categoryColors[menu.category]}`}>
                    {categoryLabels[menu.category]}
                </Badge>
            </TableCell>
            <TableCell className="font-medium text-zinc-300">
                Rp {menu.price.toLocaleString("id-ID")}
            </TableCell>
            <TableCell>
                {menu.menuOptions.length > 0 ? (
                    <span className="text-xs text-zinc-400 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                        {menu.menuOptions.length} options
                    </span>
                ) : (
                    <span className="text-sm text-zinc-600">-</span>
                )}
            </TableCell>
            <TableCell>
                {menu.isActive ? (
                    menu.isAvailable ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-full">Tersedia</Badge>
                    ) : (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 rounded-full">Habis</Badge>
                    )
                ) : (
                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 border-white/5 rounded-full">Nonaktif</Badge>
                )}
            </TableCell>
            <TableCell>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:bg-white/5 text-zinc-400 hover:text-white cursor-pointer">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-zinc-300">
                        <DropdownMenuItem asChild className="focus:bg-white/5 focus:text-white cursor-pointer">
                            <Link href={`/admin/menus/edit/${menu.id}`}>
                                <Pencil className="w-4 h-4 mr-2 text-primary" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                            onClick={() => onDelete(menu.id)}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    )
}

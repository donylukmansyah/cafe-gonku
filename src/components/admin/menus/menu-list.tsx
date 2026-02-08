"use client"

import { useState, useMemo, useEffect } from "react"
import { Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { MenuTableItem } from "./menu-table-item"
import { MenuCard } from "./menu-card"
import { MenuFilters } from "./menu-filters"

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

interface MenuListProps {
    initialMenus: Menu[]
    onDelete: (id: string) => void
}

export function MenuList({ initialMenus, onDelete }: MenuListProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [isSearching, setIsSearching] = useState(false)

    // Filtered data logic with useMemo
    const filteredMenus = useMemo(() => {
        return initialMenus.filter((menu) => {
            const matchesSearch = menu.name.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesCategory = selectedCategory === "all" || menu.category === selectedCategory
            return matchesSearch && matchesCategory
        })
    }, [initialMenus, searchQuery, selectedCategory])

    // Added "cool" searching effect as requested by user
    useEffect(() => {
        if (searchQuery || selectedCategory !== "all") { // Trigger loading if search query or category changes
            setIsSearching(true)
            const timer = setTimeout(() => setIsSearching(false), 300)
            return () => clearTimeout(timer)
        } else {
            setIsSearching(false)
        }
    }, [searchQuery, selectedCategory])

    return (
        <div className="space-y-8">
            <MenuFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
            />

            {/* Mobile/Tablet Grid View */}
            <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
                {isSearching ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="bg-zinc-900/40 border border-white/5 rounded-3xl p-5 h-32 animate-pulse">
                            <div className="flex gap-4">
                                <Skeleton className="w-24 h-24 rounded-2xl bg-zinc-800" />
                                <div className="flex-1 space-y-3">
                                    <Skeleton className="h-5 w-3/4 bg-zinc-800" />
                                    <Skeleton className="h-4 w-1/2 bg-zinc-800/50" />
                                    <Skeleton className="h-6 w-1/3 bg-zinc-800/30" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : filteredMenus.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-zinc-900/40 border border-white/5 rounded-3xl">
                        <Search className="w-10 h-10 mx-auto text-zinc-700 mb-4 opacity-20" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Menu tidak ditemukan</p>
                    </div>
                ) : (
                    filteredMenus.map((menu) => (
                        <MenuCard
                            key={menu.id}
                            menu={menu}
                            onDelete={onDelete}
                        />
                    ))
                )}
            </div>

            {/* Desktop Table View */}
            <Card className="hidden lg:block bg-zinc-900/40 backdrop-blur-md border-white/5 shadow-2xl shadow-black/40 overflow-hidden ring-1 ring-white/5 rounded-3xl">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-zinc-400 font-semibold uppercase text-[10px] tracking-widest pl-8 py-6">Product</TableHead>
                                    <TableHead className="text-zinc-400 font-semibold uppercase text-[10px] tracking-widest py-6">Detail</TableHead>
                                    <TableHead className="text-zinc-400 font-semibold uppercase text-[10px] tracking-widest py-6">Category</TableHead>
                                    <TableHead className="text-zinc-400 font-semibold uppercase text-[10px] tracking-widest py-6">Price</TableHead>
                                    <TableHead className="text-zinc-400 font-semibold uppercase text-[10px] tracking-widest py-6">Options</TableHead>
                                    <TableHead className="text-zinc-400 font-semibold uppercase text-[10px] tracking-widest py-6">Status</TableHead>
                                    <TableHead className="w-20 pr-8"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isSearching ? (
                                    // Cool Skeleton loading for searching
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i} className="border-white/5">
                                            <TableCell className="pl-8 py-5"><Skeleton className="h-12 w-12 rounded-xl bg-zinc-800" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-40 bg-zinc-800" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24 bg-zinc-800/50" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24 bg-zinc-800/30" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16 bg-zinc-800/20" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full bg-zinc-800" /></TableCell>
                                            <TableCell className="pr-8 text-right"><Skeleton className="h-8 w-8 ml-auto bg-zinc-800" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredMenus.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-20 text-zinc-500 bg-white/[0.01]">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
                                                    <Search className="w-5 h-5 opacity-20" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-zinc-400">Menu tidak ditemukan</p>
                                                    <p className="text-xs text-zinc-600 mt-1">Coba cari kata kunci lain atau ganti kategori.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredMenus.map((menu) => (
                                        <MenuTableItem
                                            key={menu.id}
                                            menu={menu}
                                            onDelete={onDelete}
                                        />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

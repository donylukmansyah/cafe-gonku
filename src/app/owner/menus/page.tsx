"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Search, LayoutGrid, List, Filter } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { MenuList } from "@/components/owner/menus/menu-list"
import { useOwnerMenus } from "@/hooks/use-owner-menus"
import {
    Input
} from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function MenusPage() {
    const [view, setView] = useState<"grid" | "table">("table")

    const {
        menus,
        isLoading,
        isSearching,
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
        statusFilter,
        setStatusFilter,
        deleteMenu,
        toggleAvailability,
        pagination,
        setPage,
    } = useOwnerMenus();

    const showInitialSkeleton = isLoading && menus.length === 0;

    if (showInitialSkeleton) {
        return <MenusLoadingSkeleton />
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">Menu</h1>
                    <p className="text-zinc-400 max-w-md mx-auto sm:mx-0">
                        Kelola katalog makanan dan minuman yang tersedia untuk pelanggan.
                    </p>
                </div>
                <Link href="/owner/menus/new">
                    <Button className="bg-primary hover:bg-primary/90 text-black font-bold shadow-[0_0_20px_rgba(53,183,24,0.15)] hover:shadow-[0_0_30px_rgba(53,183,24,0.25)] transition-all rounded-full px-8 h-12 cursor-pointer">
                        <Plus className="w-5 h-5 mr-2" />
                        Tambah Menu
                    </Button>
                </Link>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full lg:w-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder="Cari menu..."
                        className="pl-11 h-12 bg-zinc-900/50 border-white/5 rounded-xl focus-visible:ring-primary/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
                            Mencari...
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="h-12 w-[160px] bg-zinc-900/50 border-white/5 rounded-xl text-zinc-300">
                            <Filter className="w-4 h-4 mr-2 opacity-50" />
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 rounded-xl">
                            <SelectItem value="ALL">All Categories</SelectItem>
                            <SelectItem value="FOOD">Food</SelectItem>
                            <SelectItem value="DRINK">Drink</SelectItem>
                            <SelectItem value="SNACK">Snack</SelectItem>
                            <SelectItem value="DESSERT">Dessert</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-12 w-[160px] bg-zinc-900/50 border-white/5 rounded-xl text-zinc-300">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 rounded-xl">
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active Only</SelectItem>
                            <SelectItem value="INACTIVE">Archived</SelectItem>
                            <SelectItem value="AVAILABLE">In Stock</SelectItem>
                            <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex p-1 bg-zinc-900/50 rounded-xl border border-white/5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-10 w-10 rounded-lg ${view === "grid" ? "bg-primary text-black" : "text-zinc-500 hover:text-white"}`}
                            onClick={() => setView("grid")}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-10 w-10 rounded-lg ${view === "table" ? "bg-primary text-black" : "text-zinc-500 hover:text-white"}`}
                            onClick={() => setView("table")}
                        >
                            <List className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <MenuList
                menus={menus}
                view={view}
                onDelete={deleteMenu}
                onToggleAvailability={toggleAvailability}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/5 bg-zinc-900/40 rounded-2xl px-5 py-4">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    {pagination.total === 0
                        ? "0 menu"
                        : `${((pagination.page - 1) * pagination.limit) + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)} dari ${pagination.total} menu`}
                </p>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="border-white/10 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-xl"
                        disabled={!pagination.hasPreviousPage || isLoading}
                        onClick={() => setPage(Math.max(1, pagination.page - 1))}
                    >
                        Previous
                    </Button>
                    <span className="text-sm font-black text-white min-w-24 text-center">
                        Page {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                        variant="outline"
                        className="border-white/10 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-xl"
                        disabled={!pagination.hasNextPage || isLoading}
                        onClick={() => setPage(pagination.page + 1)}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}

function MenusLoadingSkeleton() {
    return (
        <div className="space-y-8 pb-10 animate-pulse">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-3 flex-1">
                    <Skeleton className="h-10 w-48 bg-zinc-800" />
                    <Skeleton className="h-4 w-72 bg-zinc-800/50" />
                </div>
                <Skeleton className="h-12 w-40 rounded-full bg-zinc-800" />
            </div>

            <div className="flex gap-4">
                <Skeleton className="h-10 flex-1 rounded-xl bg-zinc-800/50" />
                <Skeleton className="h-10 w-64 rounded-xl bg-zinc-800/50" />
            </div>

            <div className="rounded-2xl border border-white/5 bg-zinc-900/40 h-[400px]" />
        </div>
    )
}

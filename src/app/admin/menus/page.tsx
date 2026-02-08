"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { showConfirm, showSuccess, showError } from "@/lib/sweetalert"
import { Skeleton } from "@/components/ui/skeleton"
import { MenuList } from "@/components/admin/menus/menu-list"

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

export default function MenusPage() {
    const [menus, setMenus] = useState<Menu[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchMenus = useCallback(async () => {
        try {
            const res = await fetch("/api/menus")
            if (!res.ok) throw new Error("Failed to fetch")
            const data = await res.json()
            setMenus(data)
        } catch (error) {
            toast.error("Gagal memuat menu")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchMenus()
    }, [fetchMenus])

    const handleDelete = async (id: string) => {
        const result = await showConfirm(
            "Hapus Menu?",
            "Menu akan dihapus secara permanen.",
            "Ya, Hapus",
            "warning"
        )

        if (!result.isConfirmed) return

        try {
            const res = await fetch(`/api/menus/${id}`, {
                method: "DELETE",
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to delete")
            }

            showSuccess("Berhasil", "Menu berhasil dihapus")
            setMenus((prev) => prev.filter((m) => m.id !== id))
        } catch (error) {
            showError("Gagal", error instanceof Error ? error.message : "Terjadi kesalahan")
            console.error(error)
        }
    }

    if (isLoading) {
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
                <Link href="/admin/menus/new">
                    <Button className="bg-primary hover:bg-primary/90 text-black font-bold shadow-[0_0_20px_rgba(46,254,60,0.15)] hover:shadow-[0_0_30px_rgba(46,254,60,0.25)] transition-all rounded-full px-8 h-12 cursor-pointer">
                        <Plus className="w-5 h-5 mr-2" />
                        Tambah Menu
                    </Button>
                </Link>
            </div>

            <MenuList initialMenus={menus} onDelete={handleDelete} />
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

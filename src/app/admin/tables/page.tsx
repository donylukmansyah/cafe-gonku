"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import QRCode from "qrcode"
import { showConfirm, showSuccess, showError } from "@/lib/sweetalert"
import { Skeleton } from "@/components/ui/skeleton"
import { TableList } from "@/components/admin/tables/table-list"
import { CreateTableDialog } from "@/components/admin/tables/create-table-dialog"
import { QRDialog } from "@/components/admin/tables/qr-dialog"

type TableData = {
    id: string
    tableNumber: number
    qrCode: string
    capacity: number
    isActive: boolean
    _count: {
        orders: number
    }
}

export default function TablesPage() {
    const [tables, setTables] = useState<TableData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showQRDialog, setShowQRDialog] = useState(false)
    const [selectedTable, setSelectedTable] = useState<TableData | null>(null)
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

    const appUrl = useMemo(() => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", [])

    const fetchTables = useCallback(async (quiet = false) => {
        if (!quiet) setIsLoading(true)
        else setIsRefreshing(true)

        try {
            const res = await fetch("/api/tables")
            if (!res.ok) throw new Error("Failed to fetch")
            const data = await res.json()
            setTables(data)
        } catch (error) {
            toast.error("Gagal memuat data meja")
            console.error(error)
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchTables()
    }, [fetchTables])

    const handleCreateTable = async (values: { tableNumber: number, capacity: number }) => {
        try {
            const res = await fetch("/api/tables", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to create")
            }

            toast.success(`Meja #${values.tableNumber} berhasil dibuat`)
            setShowCreateDialog(false)
            fetchTables(true)
        } catch (error: any) {
            toast.error(error.message || "Gagal membuat meja")
        }
    }

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setTables(prev => prev.map(t => t.id === id ? { ...t, isActive: !currentStatus } : t))

        try {
            const res = await fetch(`/api/tables/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus }),
            })

            if (!res.ok) throw new Error("Failed to update")
        } catch (error) {
            // Revert on error
            setTables(prev => prev.map(t => t.id === id ? { ...t, isActive: currentStatus } : t))
            toast.error("Gagal mengubah status meja")
        }
    }

    const handleShowQR = async (table: TableData) => {
        setSelectedTable(table)
        setQrDataUrl(null)
        setShowQRDialog(true)

        // Generate QR code
        const orderUrl = `${appUrl}/order?table=${table.qrCode}`
        try {
            const dataUrl = await QRCode.toDataURL(orderUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            })
            setQrDataUrl(dataUrl)
        } catch (error) {
            console.error("QR generation error:", error)
            toast.error("Gagal generate QR code")
        }
    }

    const handleDownloadQR = () => {
        if (!selectedTable || !qrDataUrl) return
        const link = document.createElement("a")
        link.download = `meja-${selectedTable.tableNumber}-qr.png`
        link.href = qrDataUrl
        link.click()
    }

    const handleDelete = async (id: string) => {
        const result = await showConfirm(
            "Hapus Meja?",
            "Meja yang dihapus tidak dapat dikembalikan.",
            "Ya, Hapus",
            "warning"
        )

        if (!result.isConfirmed) return

        try {
            const res = await fetch(`/api/tables/${id}`, {
                method: "DELETE",
            })

            if (!res.ok) throw new Error("Failed to delete")

            showSuccess("Berhasil", "Meja berhasil dihapus")
            setTables(prev => prev.filter((t) => t.id !== id))
        } catch (error) {
            showError("Gagal", "Terjadi kesalahan saat menghapus meja")
            console.error(error)
        }
    }

    if (isLoading) {
        return <TablesLoadingSkeleton />
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">Manajemen Meja</h1>
                    <p className="text-zinc-400 max-w-md mx-auto sm:mx-0">
                        Atur nomor meja belanja, kapasitas pelanggan, dan kelola QR Code pesanan.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        className="h-12 border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white rounded-xl px-4 flex-1 sm:flex-none cursor-pointer"
                        onClick={() => fetchTables(true)}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        className="bg-primary hover:bg-primary/90 text-black font-bold shadow-[0_0_20px_rgba(46,254,60,0.15)] hover:shadow-[0_0_30px_rgba(46,254,60,0.25)] transition-all rounded-full px-8 h-12 flex-[2] sm:flex-none cursor-pointer"
                        onClick={() => setShowCreateDialog(true)}
                    >
                        <Plus className="w-5 h-5 mr-1" />
                        Tambah Meja
                    </Button>
                </div>
            </div>

            <TableList
                initialTables={tables}
                onShowQR={handleShowQR}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
            />

            <CreateTableDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onSubmit={handleCreateTable}
                existingTables={tables}
            />

            <QRDialog
                table={selectedTable}
                open={showQRDialog}
                onOpenChange={setShowQRDialog}
                qrDataUrl={qrDataUrl}
                appUrl={appUrl}
                onDownload={handleDownloadQR}
            />
        </div>
    )
}

function TablesLoadingSkeleton() {
    return (
        <div className="space-y-8 pb-10 animate-pulse">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-3 flex-1">
                    <Skeleton className="h-10 w-48 bg-zinc-800" />
                    <Skeleton className="h-4 w-72 bg-zinc-800/50" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-12 w-12 rounded-xl bg-zinc-800/50" />
                    <Skeleton className="h-12 w-40 rounded-full bg-zinc-800" />
                </div>
            </div>

            <Skeleton className="h-11 w-full max-w-md rounded-xl bg-zinc-800/30" />

            <div className="rounded-2xl border border-white/5 bg-zinc-900/40 h-[400px]" />
        </div>
    )
}

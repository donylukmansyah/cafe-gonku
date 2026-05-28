"use client"

import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { TableList } from "@/components/admin/tables/table-list"
import dynamic from "next/dynamic"

const CreateTableDialog = dynamic(
    () => import("@/components/admin/tables/create-table-dialog").then(mod => mod.CreateTableDialog),
    { ssr: false }
)
const QRDialog = dynamic(
    () => import("@/components/admin/tables/qr-dialog").then(mod => mod.QRDialog),
    { ssr: false }
)
import { useState, useCallback, useMemo } from "react"
import { useAdminTables, type TableData } from "@/hooks/use-admin-tables"

export default function TablesPage() {
    const {
        tables,
        isLoading,
        isRefreshing,
        fetchTables,
        createTable,
        toggleStatus,
        deleteTable,
    } = useAdminTables();

    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showQRDialog, setShowQRDialog] = useState(false)
    const [selectedTable, setSelectedTable] = useState<TableData | null>(null)
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

    const appUrl = useMemo(() => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", [])

    const handleShowQR = useCallback(async (table: TableData) => {
        setSelectedTable(table)
        setQrDataUrl(null)
        setShowQRDialog(true)

        // Generate QR code dynamically to save bundle size
        const orderUrl = `${appUrl}/order?table=${table.qrCode}`
        try {
            const QRCode = (await import("qrcode")).default;
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
    }, [appUrl]);

    const handleDownloadQR = useCallback(() => {
        if (!selectedTable || !qrDataUrl) return
        const link = document.createElement("a")
        link.download = `meja-${selectedTable.tableNumber}-qr.png`
        link.href = qrDataUrl
        link.click()
    }, [selectedTable, qrDataUrl]);

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
                        onClick={() => fetchTables()}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        className="bg-primary hover:bg-primary/90 text-black font-bold shadow-[0_0_20px_rgba(53,183,24,0.15)] hover:shadow-[0_0_30px_rgba(53,183,24,0.25)] transition-all rounded-full px-8 h-12 flex-[2] sm:flex-none cursor-pointer"
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
                onToggleStatus={toggleStatus}
                onDelete={deleteTable}
            />

            <CreateTableDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onSubmit={(values) => createTable(values, () => setShowCreateDialog(false))}
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

"use client"

import { QrCode, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow as ShadTableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

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

interface TableRowProps {
    table: TableData
    onShowQR: (table: TableData) => void
    onToggleStatus: (id: string, currentStatus: boolean) => void
    onDelete: (id: string) => void
}

export function TableRow({
    table,
    onShowQR,
    onToggleStatus,
    onDelete,
}: TableRowProps) {
    return (
        <ShadTableRow
            className={`${!table.isActive ? "opacity-50" : ""} hover:bg-white/[0.02] border-white/5 transition-colors`}
        >
            <TableCell className="pl-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center font-black text-white text-lg shadow-inner ring-1 ring-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10">#{table.tableNumber}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2.5 px-3 py-1.5 bg-zinc-800/50 rounded-lg border border-white/5 w-fit">
                    <Users className="w-4 h-4 text-primary opacity-80" />
                    <span className="font-semibold text-zinc-300 text-sm">{table.capacity} Kursi</span>
                </div>
            </TableCell>
            <TableCell>
                <code className="text-[11px] font-mono bg-black/60 border border-white/5 px-2.5 py-1 rounded-md text-zinc-400 select-all tracking-wider shadow-sm">
                    {table.qrCode}
                </code>
            </TableCell>
            <TableCell>
                {table.isActive ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                        Aktif
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 border-white/5 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                        Nonaktif
                    </Badge>
                )}
            </TableCell>
            <TableCell className="pr-6 text-right">
                <div className="flex items-center justify-end gap-1.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-9 h-9 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-primary transition-all cursor-pointer"
                        onClick={() => onShowQR(table)}
                        title="Lihat QR Code"
                    >
                        <QrCode className="w-4.5 h-4.5" />
                    </Button>
                    <div className="px-2">
                        <Switch
                            checked={table.isActive}
                            onCheckedChange={() => onToggleStatus(table.id, table.isActive)}
                            className="data-[state=checked]:bg-primary scale-90 cursor-pointer"
                            title={table.isActive ? "Nonaktifkan" : "Aktifkan"}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-9 h-9 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                        onClick={() => onDelete(table.id)}
                        title="Hapus Meja"
                    >
                        <Trash2 className="w-4.5 h-4.5" />
                    </Button>
                </div>
            </TableCell>
        </ShadTableRow>
    )
}

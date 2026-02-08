"use client"

import { useState, useMemo, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow as ShadTableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TableRow } from "./table-row"

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

interface TableListProps {
    initialTables: TableData[]
    onShowQR: (table: TableData) => void
    onToggleStatus: (id: string, currentStatus: boolean) => void
    onDelete: (id: string) => void
}

export function TableList({
    initialTables,
    onShowQR,
    onToggleStatus,
    onDelete,
}: TableListProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [isSearching, setIsSearching] = useState(false)

    const filteredTables = useMemo(() => {
        return initialTables.filter((table) => {
            const matchesSearch = table.tableNumber.toString().includes(searchQuery) ||
                table.qrCode.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesSearch
        }).sort((a, b) => a.tableNumber - b.tableNumber)
    }, [initialTables, searchQuery])

    // Added "cool" searching effect
    useEffect(() => {
        if (searchQuery) {
            setIsSearching(true)
            const timer = setTimeout(() => setIsSearching(false), 300)
            return () => clearTimeout(timer)
        } else {
            setIsSearching(false)
        }
    }, [searchQuery])

    return (
        <div className="space-y-6">
            <div className="relative group max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Cari nomor meja atau kode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-zinc-900/40 border-white/5 focus:border-primary/40 focus:ring-primary/10 transition-all rounded-xl shadow-inner text-sm"
                />
            </div>

            <Card className="bg-zinc-900/40 backdrop-blur-md border-white/5 shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/5">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <ShadTableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em] pl-6 py-5">Nomor Meja</TableHead>
                                    <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em] py-5">Kapasitas</TableHead>
                                    <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em] py-5">Kode QR</TableHead>
                                    <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em] py-5">Status</TableHead>
                                    <TableHead className="text-right pr-6 py-5 text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">Aksi</TableHead>
                                </ShadTableRow>
                            </TableHeader>
                            <TableBody>
                                {isSearching ? (
                                    [...Array(3)].map((_, i) => (
                                        <ShadTableRow key={i} className="border-white/5">
                                            <TableCell className="pl-6 py-4"><Skeleton className="h-12 w-12 rounded-xl bg-zinc-800" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-24 bg-zinc-800" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 bg-zinc-800/50" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-16 rounded-full bg-zinc-800" /></TableCell>
                                            <TableCell className="pr-6 text-right flex items-center justify-end gap-2 py-6">
                                                <Skeleton className="h-8 w-8 bg-zinc-800" />
                                                <Skeleton className="h-5 w-10 rounded-full bg-zinc-800" />
                                                <Skeleton className="h-8 w-8 bg-zinc-800" />
                                            </TableCell>
                                        </ShadTableRow>
                                    ))
                                ) : filteredTables.length === 0 ? (
                                    <ShadTableRow>
                                        <TableCell colSpan={5} className="text-center py-20 text-zinc-500 bg-white/[0.01]">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
                                                    <Search className="w-5 h-5 opacity-20" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-zinc-400">Meja tidak ditemukan</p>
                                                    <p className="text-xs text-zinc-600 mt-1">Coba masukkan nomor meja lain.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </ShadTableRow>
                                ) : (
                                    filteredTables.map((table) => (
                                        <TableRow
                                            key={table.id}
                                            table={table}
                                            onShowQR={onShowQR}
                                            onToggleStatus={onToggleStatus}
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

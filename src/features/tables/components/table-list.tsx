"use client";

import { memo, useState, useMemo } from "react";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TableRowItem } from "./table-row";
import { TableData } from "@/features/tables/hooks/use-owner-tables";

interface TableListProps {
    initialTables: TableData[];
    onShowQR: (table: TableData) => void;
    onToggleStatus: (id: string, current: boolean) => void;
    onDelete: (id: string) => void;
}

export const TableList = memo(function TableList({
    initialTables,
    onShowQR,
    onToggleStatus,
    onDelete,
}: TableListProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredTables = useMemo(() => {
        return initialTables.filter((t) =>
            t.tableNumber.toString().includes(searchQuery) ||
            t.qrCode.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [initialTables, searchQuery]);

    if (initialTables.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 bg-zinc-900/30 border border-white/5 rounded-[2.5rem] backdrop-blur-sm">
                <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center border border-white/5 mb-6">
                    <span className="text-zinc-700 font-black text-2xl italic">OFF</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Belum ada meja</h3>
                <p className="text-zinc-500">Silakan tambahkan meja untuk mulai generate QR.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                    placeholder="Cari nomor meja atau code..."
                    className="pl-11 h-12 bg-zinc-900/50 border-white/5 rounded-xl focus-visible:ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/[0.03]">
                        <TableRow className="border-white/5 pointer-events-none">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-6 py-4">Nomor Meja</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Kapasitas</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Visibility</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 px-6">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTables.map((table) => (
                            <TableRowItem
                                key={table.id}
                                table={table}
                                onShowQR={onShowQR}
                                onToggleStatus={onToggleStatus}
                                onDelete={onDelete}
                            />
                        ))}
                        {filteredTables.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-zinc-500 italic">
                                    Meja tidak ditemukan
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
});

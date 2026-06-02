"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { QrCode, Trash2, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TableData } from "@/hooks/use-admin-tables";

interface TableRowItemProps {
    table: TableData;
    onShowQR: (table: TableData) => void;
    onToggleStatus: (id: string, current: boolean) => void;
    onDelete: (id: string) => void;
}

export const TableRowItem = memo(function TableRowItem({
    table,
    onShowQR,
    onToggleStatus,
    onDelete,
}: TableRowItemProps) {
    return (
        <TableRow className="border-white/5 hover:bg-white/[0.02] transition-colors group">
            <TableCell className="py-5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center font-black text-xl text-white group-hover:bg-primary group-hover:text-black transition-all">
                        {table.tableNumber}
                    </div>
                    <div>
                        <div className="font-bold text-white">Meja #{table.tableNumber}</div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                            Code: {table.qrCode.split('_').pop()}
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-lg w-fit border border-white/5 text-zinc-300">
                    <Users className="w-4 h-4 text-zinc-500" />
                    <span className="font-bold">{table.capacity}</span>
                    <span className="text-[10px] uppercase font-black text-zinc-600">Pax</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col items-center gap-2 w-fit">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${table.isActive ? 'bg-emerald-500 animate-pulse-slow' : 'bg-red-500'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${table.isActive ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                            {table.isActive ? 'Active' : 'Offline'}
                        </span>
                    </div>
                    <Switch
                        checked={table.isActive}
                        onCheckedChange={() => onToggleStatus(table.id, table.isActive)}
                        className="h-4 w-8 data-[state=checked]:bg-emerald-500/40 data-[state=checked]:border-emerald-500/50 border-white/5 bg-zinc-800 [&>span]:h-3 [&>span]:w-3 [&>span[data-state=checked]]:translate-x-4 [&>span[data-state=unchecked]]:translate-x-0"
                    />
                </div>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 hover:bg-primary/10 text-zinc-400 hover:text-primary rounded-xl transition-all"
                        onClick={() => onShowQR(table)}
                    >
                        <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-xl transition-all"
                        onClick={() => onDelete(table.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
});

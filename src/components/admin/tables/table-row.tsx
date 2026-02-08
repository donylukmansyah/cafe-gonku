"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
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
                <div className="flex items-center gap-2">
                    {table._count.orders > 0 ? (
                        <Badge className="bg-primary/20 text-primary border-primary/20 uppercase font-black text-[10px] px-3">
                            {table._count.orders} Active Orders
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-zinc-500 border-zinc-800 uppercase font-black text-[10px] px-3">
                            No Active Orders
                        </Badge>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Switch
                        checked={table.isActive}
                        onCheckedChange={() => onToggleStatus(table.id, table.isActive)}
                        className="data-[state=checked]:bg-primary"
                    />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${table.isActive ? 'text-primary' : 'text-zinc-600'}`}>
                        {table.isActive ? 'Active' : 'Offline'}
                    </span>
                </div>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl transition-all"
                        onClick={() => onShowQR(table)}
                    >
                        <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                        onClick={() => onDelete(table.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
});

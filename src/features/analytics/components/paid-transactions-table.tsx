"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CAFE_TIMEZONE } from "@/shared/cafe-date";
import { formatPrice } from "@/shared/utils";

type PaidTransaction = {
    orderCode: string;
    paidAt: string;
    totalAmount: number;
    serviceType: string;
    paymentMethod: string | null;
    orderStatus: string;
    tableNumber: number;
};

const paidAtFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: CAFE_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
});

const statusLabels: Record<string, string> = {
    PAID: "Menunggu dapur",
    PREPARING: "Dimasak",
    READY: "Siap diantar",
    SERVED: "Selesai",
};

export const PaidTransactionsTable = memo(function PaidTransactionsTable({
    transactions,
}: {
    transactions: PaidTransaction[];
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 hide-on-print">
            <div className="flex flex-col gap-1 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white">Riwayat Transaksi Terbayar</h2>
                    <p className="text-sm text-zinc-400">
                        Hanya pesanan berstatus pembayaran PAID pada periode terpilih.
                    </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-zinc-300">
                    {transactions.length} transaksi
                </span>
            </div>

            {transactions.length === 0 ? (
                <div className="px-5 py-12 text-center">
                    <p className="font-semibold text-zinc-200">Belum ada transaksi terbayar</p>
                    <p className="mt-1 text-sm text-zinc-500">Coba pilih periode laporan lain.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader className="bg-zinc-950/60">
                        <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="px-5 text-zinc-400">Kode</TableHead>
                            <TableHead className="text-zinc-400">Waktu Bayar</TableHead>
                            <TableHead className="text-zinc-400">Layanan</TableHead>
                            <TableHead className="text-zinc-400">Metode</TableHead>
                            <TableHead className="text-zinc-400">Status Pesanan</TableHead>
                            <TableHead className="px-5 text-right text-zinc-400">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((transaction) => (
                            <TableRow key={transaction.orderCode} className="border-white/5 hover:bg-white/[0.03]">
                                <TableCell className="px-5 font-bold text-white">{transaction.orderCode}</TableCell>
                                <TableCell className="text-zinc-300">
                                    {paidAtFormatter.format(new Date(transaction.paidAt))} WIB
                                </TableCell>
                                <TableCell className="text-zinc-300">
                                    {transaction.serviceType === "TAKEAWAY"
                                        ? "Bawa pulang"
                                        : `Meja ${transaction.tableNumber}`}
                                </TableCell>
                                <TableCell className="text-zinc-300">
                                    {transaction.paymentMethod?.replaceAll("_", " ").toUpperCase() ?? "DOKU"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                                        {statusLabels[transaction.orderStatus] ?? transaction.orderStatus}
                                    </Badge>
                                </TableCell>
                                <TableCell className="px-5 text-right font-bold tabular-nums text-white">
                                    {formatPrice(transaction.totalAmount)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </section>
    );
});

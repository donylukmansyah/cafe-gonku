"use client"

import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

type TableData = {
    id: string
    tableNumber: number
    qrCode: string
}

interface QRDialogProps {
    table: TableData | null
    open: boolean
    onOpenChange: (open: boolean) => void
    qrDataUrl: string | null
    appUrl: string
    onDownload: () => void
}

export function QRDialog({
    table,
    open,
    onOpenChange,
    qrDataUrl,
    appUrl,
    onDownload,
}: QRDialogProps) {
    if (!table) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm bg-zinc-900 border-white/10 text-zinc-300 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl font-bold text-white">QR Code Meja #{table.tableNumber}</DialogTitle>
                    <DialogDescription className="text-center text-zinc-500">
                        Scan QR untuk order dari meja ini
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center py-8">
                    <div className="bg-white p-5 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)] ring-1 ring-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                        {qrDataUrl ? (
                            <>
                                {/* QR data URLs are generated client-side; next/image adds no value here. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={qrDataUrl} alt="QR Code" className="w-52 h-52 relative z-10" />
                            </>
                        ) : (
                            <div className="w-52 h-52 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                    <div className="mt-8 px-4 py-2 bg-black/40 rounded-xl border border-white/5 w-full">
                        <p className="text-[10px] text-zinc-500 text-center font-mono break-all opacity-80 uppercase tracking-tighter">
                            {appUrl}/t/{table.qrCode}
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        className="w-full bg-primary hover:bg-primary/90 text-black font-bold h-12 rounded-xl shadow-[0_0_20px_rgba(53,183,24,0.15)] transition-all cursor-pointer"
                        onClick={onDownload}
                        disabled={!qrDataUrl}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download QR Image
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

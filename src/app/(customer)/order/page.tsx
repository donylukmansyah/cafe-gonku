import { Suspense, cache } from "react";
import { prisma } from "@/lib/prisma";
import { OrderClient } from "./order-client";
import { Button } from "@/components/ui/button";
import { MapPin, Utensils } from "lucide-react";
import Link from "next/link";
import { Menu } from "@/types/menu";

// 1. Fetch Data on Server with Deduplication
const getTableAndMenus = cache(async (qrCode: string | undefined) => {
    if (!qrCode) return { table: null, menus: [] };

    // Optimize: Check table first to short-circuit
    const table = await prisma.table.findFirst({
        where: { qrCode: qrCode, isActive: true },
        select: { id: true, tableNumber: true, qrCode: true }
    });

    if (!table) return { table: null, menus: [] };

    // Only fetch menus if table is valid
    const menus = await prisma.menu.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            category: true,
            isAvailable: true,
            menuOptions: {
                select: {
                    id: true,
                    name: true,
                    isRequired: true,
                    values: {
                        select: {
                            id: true,
                            label: true,
                            priceAdjust: true,
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: "desc" },
    });

    return { table, menus };
});

interface PageProps {
    searchParams: Promise<{ table?: string }>;
}

export default async function OrderPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const tableQr = searchParams.table;

    // 2. Resolve Data
    const { table, menus } = await getTableAndMenus(tableQr);

    // 3. Handle Errors / Empty States (Server Side Rendering)
    if (!tableQr || !table) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center space-y-6">
                <div className="w-20 h-20 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center border border-white/5">
                    <MapPin className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white">Oops! Meja Belum Terdeteksi</h2>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                        Silakan scan QR Code yang ada di meja kamu untuk mulai memesan makanan.
                    </p>
                    {!tableQr ? (
                        <p className="text-xs text-zinc-600 font-mono bg-zinc-900/50 p-2 rounded">Code: MISSING_QR</p>
                    ) : (
                        <p className="text-xs text-zinc-600 font-mono bg-zinc-900/50 p-2 rounded">Code: INVALID_TABLE</p>
                    )}
                </div>
                <Link href="/" className="w-full">
                    <Button className="bg-primary hover:bg-primary/90 text-black font-black w-full rounded-2xl h-12 transition-all active:scale-95">
                        Kembali Ke Home
                    </Button>
                </Link>
            </div>
        );
    }

    // 4. Render Client Component with Data
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Utensils className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
                </div>
                <p className="text-zinc-500 font-bold text-sm animate-pulse">Menyiapkan Menu...</p>
            </div>
        }>
            <OrderClient initialMenus={menus as Menu[]} table={table} />
        </Suspense>
    );
}

import { Suspense } from "react";
import { TableService } from "@/lib/services/table.service";
import { MenuService } from "@/lib/services/menu.service";
import { OrderClient } from "./order-client";
import { Button } from "@/components/ui/button";
import { MapPin, Utensils } from "lucide-react";
import Link from "next/link";

const getTableAndMenus = async (qrCode: string | undefined) => {
    if (!qrCode) return { table: null, menus: [] };

    const table = await TableService.getTableByQrCode(qrCode);

    if (!table) return { table: null, menus: [] };

    const menus = await MenuService.getMenus();

    return { table, menus };
};

interface PageProps {
    searchParams: Promise<{ table?: string }>;
}

async function OrderContent({ searchParamsPromise }: { searchParamsPromise: Promise<{ table?: string }> }) {
    const searchParams = await searchParamsPromise;
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

    return <OrderClient initialMenus={menus || []} table={table} />;
}

export default function OrderPage(props: PageProps) {
    // 4. Render Client Component with Data within Suspense boundary
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
            <OrderContent searchParamsPromise={props.searchParams} />
        </Suspense>
    );
}

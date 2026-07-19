import { Suspense } from "react";
import { TableService } from "@/features/tables/server/table.service";
import { MenuService } from "@/features/menus/server/menu.service";
import { OrderClient } from "@/features/orders/components/customer/order-client";
import { Button } from "@/components/ui/button";
import { MapPin, Utensils } from "lucide-react";
import Link from "next/link";

const CUSTOMER_MENU_LIMIT = 20;

const getTableAndMenus = async (qrCode: string) => {
    const table = await TableService.getTableByQrCode(qrCode);

    if (!table) return { table: null, menus: [], pagination: null };

    const { menus, pagination } = await MenuService.getMenusPage({
        page: 1,
        limit: CUSTOMER_MENU_LIMIT,
        onlyAvailable: true,
    });

    return { table, menus, pagination };
};

interface PageProps {
    params: Promise<{ qrCode: string }>;
}

async function TableOrderContent({ paramsPromise }: { paramsPromise: Promise<{ qrCode: string }> }) {
    const { qrCode } = await paramsPromise;
    const { table, menus, pagination } = await getTableAndMenus(qrCode);

    if (!table) {
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
                    <p className="text-xs text-zinc-600 font-mono bg-zinc-900/50 p-2 rounded">Code: INVALID_TABLE</p>
                </div>
                <Link href="/" className="w-full">
                    <Button className="bg-primary hover:bg-primary/90 text-black font-black w-full rounded-2xl h-12 transition-all active:scale-95">
                        Kembali Ke Home
                    </Button>
                </Link>
            </div>
        );
    }

    return <OrderClient initialMenus={menus || []} initialPagination={pagination} table={table} />;
}

export default function TableOrderPage(props: PageProps) {
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
            <TableOrderContent paramsPromise={props.params} />
        </Suspense>
    );
}

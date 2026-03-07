import { requireRole } from "@/lib/server-auth"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"

async function KitchenLayoutContent({
    children,
}: {
    children: React.ReactNode
}) {
    // Protect the layout server-side
    // This immediately redirects unauthenticated users or those without the KITCHEN role
    await requireRole("KITCHEN")

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary/30">
            {children}
        </div>
    )
}

export default function KitchenLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-zinc-500 font-bold text-sm">Menghubungkan ke Dapur...</p>
            </div>
        }>
            <KitchenLayoutContent>{children}</KitchenLayoutContent>
        </Suspense>
    )
}

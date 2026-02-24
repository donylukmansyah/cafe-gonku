import { requireRole } from "@/lib/server-auth"

export default async function KitchenLayout({
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

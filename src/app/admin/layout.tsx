import { requireRole } from "@/lib/server-auth"
import { Coffee, Loader2 } from "lucide-react"
import { SidebarLogoutButton } from "@/components/admin/sidebar-logout-button"
import { SidebarMenuButton } from "@/components/admin/sidebar-menu-button"
import { SidebarDesktopNav } from "@/components/admin/sidebar-desktop-nav"
import { Suspense } from "react"

async function AdminLayoutContent({
    children,
}: {
    children: React.ReactNode
}) {
    // Protect the layout server-side inside Suspense for Cache Components compatibility.
    const session = await requireRole("ADMIN")

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Mobile Header */}
            <header className="lg:hidden sticky top-0 z-40 bg-zinc-900 border-b border-zinc-800 h-16 flex items-center px-4 justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Coffee className="w-5 h-5 text-black" />
                    </div>
                    <span className="font-bold text-lg text-white">Cafe Gonku</span>
                </div>

                <SidebarMenuButton sessionName={session.user.name} sessionEmail={session.user.email} />
            </header>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64">
                <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 h-16">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(53,183,24,0.3)]">
                            <Coffee className="w-5 h-5 text-black fill-black/20" />
                        </div>
                        <span className="font-bold text-lg text-white tracking-tight">Cafe Gonku</span>
                    </div>

                    {/* Navigation */}
                    <SidebarDesktopNav />

                    {/* User & Logout */}
                    <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                        <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
                            <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                                <span className="text-sm font-bold text-primary">
                                    {session.user.name?.charAt(0) || "A"}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-white">
                                    {session.user.name || "Admin"}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">
                                    {session.user.email}
                                </p>
                            </div>
                        </div>
                        <SidebarLogoutButton />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:pl-64 min-h-[calc(100vh-4rem)] lg:min-h-screen transition-all bg-black">
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-zinc-500 font-bold text-sm">Masuk Sistem Admin...</p>
            </div>
        }>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </Suspense>
    )
}

"use client"

import { useEffect } from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard,
    UtensilsCrossed,
    TableProperties,
    BarChart3,
    LogOut,
    Coffee,
    Loader2,
} from "lucide-react"

import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { useState } from "react"

const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Menu", href: "/admin/menus", icon: UtensilsCrossed },
    { name: "Meja", href: "/admin/tables", icon: TableProperties },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
]

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const { data: session, isPending } = useSession()
    const [open, setOpen] = useState(false)

    // Protect the layout
    useEffect(() => {
        if (!isPending) {
            const user = session?.user as { role?: string } | undefined
            if (!session || user?.role !== "ADMIN") {
                router.push("/login")
            }
        }
    }, [isPending, session, router])

    const handleLogout = async () => {
        await signOut()
        router.push("/login")
        router.refresh()
    }

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!session) return null

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 h-16">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(46,254,60,0.3)]">
                    <Coffee className="w-5 h-5 text-black fill-black/20" />
                </div>
                <span className="font-bold text-lg text-white tracking-tight">Cafe Gonku</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                {navigation.map((item) => {
                    const isActive = item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname === item.href || pathname.startsWith(item.href + "/")
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer",
                                isActive
                                    ? "bg-primary/10 text-primary shadow-sm"
                                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300")} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            {/* User & Logout */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
                    <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                        <span className="text-sm font-bold text-primary">
                            {session?.user?.name?.charAt(0) || "A"}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-white">
                            {session?.user?.name || "Admin"}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                            {session?.user?.email}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full border-zinc-700 bg-transparent text-zinc-300 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/50 transition-colors cursor-pointer"
                    onClick={handleLogout}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                </Button>
            </div>
        </div>
    )

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

                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mr-2 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer">
                            <Menu className="w-6 h-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-72 border-r-zinc-800 bg-zinc-900">
                        <div className="sr-only">
                            <SheetTitle>Navigation Menu</SheetTitle>
                        </div>
                        <SidebarContent />
                    </SheetContent>
                </Sheet>
            </header>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64">
                <SidebarContent />
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

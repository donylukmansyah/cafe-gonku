"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Menu, LayoutDashboard, UtensilsCrossed, TableProperties, BarChart3, Coffee } from "lucide-react"
import { SidebarLogoutButton } from "./sidebar-logout-button"

const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Menu", href: "/admin/menus", icon: UtensilsCrossed },
    { name: "Meja", href: "/admin/tables", icon: TableProperties },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
]

export function SidebarMenuButton({ sessionName, sessionEmail }: { sessionName?: string | null, sessionEmail?: string | null }) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer">
                    <Menu className="w-6 h-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r-zinc-800 bg-zinc-900">
                <div className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                    <SheetDescription>Daftar navigasi dashboard admin Cafe Gonku.</SheetDescription>
                </div>

                <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 h-16">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(53,183,24,0.3)]">
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
                                    {sessionName?.charAt(0) || "A"}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-white">
                                    {sessionName || "Admin"}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">
                                    {sessionEmail}
                                </p>
                            </div>
                        </div>
                        <SidebarLogoutButton />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

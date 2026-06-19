"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, UtensilsCrossed, TableProperties, BarChart3 } from "lucide-react"

const navigation = [
    { name: "Dashboard", href: "/owner", icon: LayoutDashboard },
    { name: "Menu", href: "/owner/menus", icon: UtensilsCrossed },
    { name: "Meja", href: "/owner/tables", icon: TableProperties },
    { name: "Analytics", href: "/owner/analytics", icon: BarChart3 },
]

export function SidebarDesktopNav() {
    const pathname = usePathname()

    return (
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            {navigation.map((item) => {
                const isActive = item.href === "/owner"
                    ? pathname === "/owner"
                    : pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                    <Link
                        key={item.name}
                        href={item.href}
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
    )
}

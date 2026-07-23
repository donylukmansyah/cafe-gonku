import { BarChart3, LayoutDashboard, TableProperties, UtensilsCrossed } from "lucide-react";

export const OWNER_NAVIGATION = [
    { name: "Dashboard", href: "/owner", icon: LayoutDashboard },
    { name: "Menu", href: "/owner/menus", icon: UtensilsCrossed },
    { name: "Meja", href: "/owner/tables", icon: TableProperties },
    { name: "Laporan & Transaksi", href: "/owner/laporan-transaksi", icon: BarChart3 },
] as const;

import { cacheLife, cacheTag } from "next/cache"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { UtensilsCrossed, TableProperties, ShoppingCart, TrendingUp, ArrowRight, Activity, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AnalyticsService } from "@/lib/services/analytics.service"
import { OWNER_DASHBOARD_CACHE_TAG } from "@/lib/cache-tags"
import { OrderService } from "@/lib/services/order.service"

async function getStats() {
    'use cache';
    cacheLife({ revalidate: 60 });
    cacheTag(OWNER_DASHBOARD_CACHE_TAG);

    return AnalyticsService.getOwnerOverview();
}

async function getLatePaymentIssues() {
    'use cache';
    cacheLife({ revalidate: 60 });
    cacheTag(OWNER_DASHBOARD_CACHE_TAG);

    return OrderService.getLatePaymentIssues(5);
}

export default async function OwnerDashboardPage() {
    const [stats, latePaymentIssues] = await Promise.all([
        getStats(),
        getLatePaymentIssues(),
    ])

    const statCards = [
        {
            title: "Total Menu",
            value: stats.menuCount,
            description: "Menu aktif saat ini",
            icon: UtensilsCrossed,
            color: "text-blue-400",
            bgColor: "bg-blue-500/10",
            href: "/owner/menus",
        },
        {
            title: "Total Meja",
            value: stats.tableCount,
            description: "Meja tersedia untuk QR",
            icon: TableProperties,
            color: "text-emerald-400",
            bgColor: "bg-emerald-500/10",
            href: "/owner/tables",
        },
        {
            title: "Order Hari Ini",
            value: stats.todayOrders,
            description: "Pesanan lunas hari ini",
            icon: ShoppingCart,
            color: "text-primary",
            bgColor: "bg-primary/10",
            href: "/owner/analytics",
        },
        {
            title: "Revenue Hari Ini",
            value: `Rp ${stats.totalRevenue.toLocaleString("id-ID")}`,
            description: "Gabungan QR payment + pendapatan kasir",
            icon: TrendingUp,
            color: "text-purple-400",
            bgColor: "bg-purple-500/10",
            href: "/owner/analytics",
        },
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header - Centered on mobile */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 border-b border-white/5 pb-8 mb-8">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">Dashboard</h1>
                    <p className="text-zinc-400 max-w-md mx-auto sm:mx-0">
                        Overview aktivitas bisnis dan performa cafe Anda hari ini.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-10 border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white hover:border-primary/30 transition-all rounded-full px-6 cursor-pointer">
                        <Activity className="mr-2 h-4 w-4 text-primary" />
                        Refresh Data
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {statCards.map((stat) => (
                    <Link key={stat.title} href={stat.href} className="block group cursor-pointer">
                        <Card className="h-full bg-zinc-900/40 backdrop-blur-sm border-white/5 hover:border-primary/20 hover:bg-zinc-900/60 transition-all duration-300 overflow-hidden relative">
                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${stat.bgColor.replace('bg-', 'from-').replace('/10', '/5')} to-transparent`} />

                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                                <CardTitle className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                    {stat.title}
                                </CardTitle>
                                <div className={`p-2.5 rounded-xl ${stat.bgColor} bg-opacity-20 ring-1 ring-inset ring-white/5`}>
                                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{stat.value}</div>
                                <p className="text-xs text-zinc-500 mt-2 font-medium">
                                    {stat.description}
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {latePaymentIssues.length > 0 && (
                <Card className="bg-red-950/20 border-red-500/20 shadow-2xl shadow-red-950/20">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Late Payment Alert</CardTitle>
                                <CardDescription className="text-red-200/70">
                                    Pembayaran masuk setelah expired. Jangan proses otomatis; cocokkan dengan customer/kasir.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                            <h3 className="text-sm font-bold text-amber-300 mb-2">SOP Kasir / Owner</h3>
                            <ol className="list-decimal pl-4 space-y-1 text-xs leading-relaxed text-zinc-300">
                                <li>Cocokkan <span className="font-mono text-white">orderCode</span>, nominal, dan jam bayar di dashboard Doku/Midtrans.</li>
                                <li>Jika uang benar masuk dan customer masih mau pesan, buat pesanan baru/manual ke dapur. Jangan pakai QR/order lama.</li>
                                <li>Jika customer tidak jadi pesan, proses refund/settlement sesuai dashboard payment gateway.</li>
                                <li>Jangan ubah database manual kecuali sudah cocok dengan mutasi gateway.</li>
                            </ol>
                        </div>

                        {latePaymentIssues.map((issue) => (
                            <div key={issue.id} className="rounded-2xl border border-red-500/10 bg-black/20 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-sm font-bold text-white">{issue.order.orderCode}</span>
                                        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
                                            Late payment
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400">
                                        {issue.order.customerName || "Pelanggan"} • Meja {issue.order.table.tableNumber} • Rp {issue.order.totalAmount.toLocaleString("id-ID")}
                                    </p>
                                    <p className="text-[11px] text-zinc-500 line-clamp-2">{issue.message}</p>
                                </div>
                                <div className="text-left md:text-right space-y-1 shrink-0">
                                    <p className="text-xs text-zinc-400">
                                        {issue.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                                    </p>
                                    <p className="text-[11px] text-zinc-500">
                                        Order: {issue.order.status} • Payment: {issue.order.paymentStatus}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Quick Actions */}
            <div className="grid gap-6">
                <Card className="bg-zinc-900/30 border-white/5 backdrop-blur-sm shadow-2xl shadow-black/40">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Quick Actions</CardTitle>
                        <CardDescription className="text-zinc-500">
                            Pintas cepat untuk operasional harian.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Link href="/owner/menus/new">
                            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-primary/5 hover:border-primary/30 cursor-pointer transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                <div className="p-3.5 bg-black/40 rounded-xl group-hover:bg-primary/20 transition-colors border border-white/5">
                                    <UtensilsCrossed className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex-1 relative z-10">
                                    <h3 className="font-semibold text-white group-hover:text-primary transition-colors">Tambah Menu</h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">Buat item menu baru</p>
                                </div>
                                <div className="text-zinc-700 group-hover:text-primary transition-colors">
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>
                        </Link>
                        <Link href="/owner/tables">
                            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-primary/5 hover:border-primary/30 cursor-pointer transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                <div className="p-3.5 bg-black/40 rounded-xl group-hover:bg-primary/20 transition-colors border border-white/5">
                                    <TableProperties className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex-1 relative z-10">
                                    <h3 className="font-semibold text-white group-hover:text-primary transition-colors">Setup Meja</h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">Generate QR code meja</p>
                                </div>
                                <div className="text-zinc-700 group-hover:text-primary transition-colors">
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>
                        </Link>
                        <Link href="/owner/analytics">
                            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-primary/5 hover:border-primary/30 cursor-pointer transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                <div className="p-3.5 bg-black/40 rounded-xl group-hover:bg-primary/20 transition-colors border border-white/5">
                                    <TrendingUp className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex-1 relative z-10">
                                    <h3 className="font-semibold text-white group-hover:text-primary transition-colors">Lihat Penjualan</h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">Buka laporan penjualan</p>
                                </div>
                                <div className="text-zinc-700 group-hover:text-primary transition-colors">
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

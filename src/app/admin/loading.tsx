import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function AdminDashboardLoading() {
    return (
        <div className="space-y-8 animate-pulse pb-10">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 border-b border-white/5 pb-8 mb-8">
                <div className="text-center sm:text-left space-y-2">
                    <Skeleton className="h-10 w-48 bg-zinc-800" />
                    <Skeleton className="h-4 w-64 bg-zinc-800/50" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-32 rounded-full bg-zinc-800" />
                </div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="h-full bg-zinc-900/40 border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <Skeleton className="h-4 w-24 bg-zinc-800" />
                            <Skeleton className="h-8 w-8 rounded-xl bg-zinc-800" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-2 bg-zinc-800" />
                            <Skeleton className="h-3 w-32 bg-zinc-800/50" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions & Recent Activity Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Quick Actions */}
                <Card className="col-span-4 bg-zinc-900/30 border-white/5">
                    <CardHeader>
                        <Skeleton className="h-6 w-32 mb-2 bg-zinc-800" />
                        <Skeleton className="h-4 w-48 bg-zinc-800/50" />
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/5">
                                <Skeleton className="h-12 w-12 rounded-xl bg-zinc-800" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-5 w-24 bg-zinc-800" />
                                    <Skeleton className="h-3 w-32 bg-zinc-800/50" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* System Status */}
                <Card className="col-span-3 bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <Skeleton className="h-6 w-32 mb-2 bg-zinc-800" />
                        <Skeleton className="h-4 w-48 bg-zinc-800/50" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                                    <Skeleton className="h-4 w-24 bg-zinc-800" />
                                    <Skeleton className="h-5 w-16 rounded-full bg-zinc-800" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

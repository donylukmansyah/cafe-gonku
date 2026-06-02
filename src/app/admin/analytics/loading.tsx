import { Skeleton } from "@/components/ui/skeleton"

export default function AnalyticsLoading() {
    return (
        <div className="space-y-8 pb-10 animate-pulse">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-3 flex-1 w-full text-center sm:text-left">
                    <Skeleton className="h-10 w-64 bg-zinc-800 mx-auto sm:mx-0" />
                    <Skeleton className="h-4 w-96 bg-zinc-800/30 mx-auto sm:mx-0" />
                </div>
                <Skeleton className="h-12 w-44 rounded-xl bg-zinc-800/50 shrink-0" />
            </div>

            {/* Stats Cards Row */}
            <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-3xl bg-zinc-900/40 border border-white/5" />
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-5">
                <Skeleton className="lg:col-span-3 h-[500px] rounded-3xl bg-zinc-900/40 border border-white/5" />
                <Skeleton className="lg:col-span-2 h-[500px] rounded-3xl bg-zinc-900/40 border border-white/5" />
            </div>
        </div>
    )
}

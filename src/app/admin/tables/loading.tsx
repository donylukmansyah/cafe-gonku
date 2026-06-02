import { Skeleton } from "@/components/ui/skeleton"

export default function TablesLoading() {
    return (
        <div className="space-y-8 pb-10 animate-pulse">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-3 flex-1 w-full text-center sm:text-left">
                    <Skeleton className="h-10 w-64 bg-zinc-800 mx-auto sm:mx-0" />
                    <Skeleton className="h-4 w-80 bg-zinc-800/50 mx-auto sm:mx-0" />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-center sm:justify-start">
                    <Skeleton className="h-12 w-12 rounded-xl bg-zinc-800/50" />
                    <Skeleton className="h-12 w-40 rounded-full bg-zinc-800" />
                </div>
            </div>

            {/* List Container */}
            <div className="rounded-2xl border border-white/5 bg-zinc-900/40 h-[450px]" />
        </div>
    )
}

import { Skeleton } from "@/components/ui/skeleton"

export default function MenusLoading() {
    return (
        <div className="space-y-8 pb-10 animate-pulse">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-3 flex-1 w-full text-center sm:text-left">
                    <Skeleton className="h-10 w-48 bg-zinc-800 mx-auto sm:mx-0" />
                    <Skeleton className="h-4 w-72 bg-zinc-800/50 mx-auto sm:mx-0" />
                </div>
                <Skeleton className="h-12 w-40 rounded-full bg-zinc-800 shrink-0" />
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 items-center">
                <Skeleton className="h-12 flex-1 w-full rounded-xl bg-zinc-800/50" />
                <div className="flex gap-4 w-full lg:w-auto shrink-0 justify-center sm:justify-start">
                    <Skeleton className="h-12 w-32 rounded-xl bg-zinc-800/50" />
                    <Skeleton className="h-12 w-32 rounded-xl bg-zinc-800/50" />
                    <Skeleton className="h-12 w-24 rounded-xl bg-zinc-800/50" />
                </div>
            </div>

            {/* List Table Container */}
            <div className="rounded-2xl border border-white/5 bg-zinc-900/40 h-[450px]" />
        </div>
    )
}

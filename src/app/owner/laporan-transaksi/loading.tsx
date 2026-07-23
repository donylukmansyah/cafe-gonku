import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsAndTransactionsLoading() {
    return (
        <div className="space-y-6 pb-10 animate-pulse">
            <div className="space-y-3 border-b border-white/5 pb-5">
                <Skeleton className="h-10 w-80 max-w-full bg-zinc-800" />
                <Skeleton className="h-4 w-96 max-w-full bg-zinc-800/40" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl bg-zinc-900 sm:w-72" />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-40 rounded-2xl bg-zinc-900/40" />
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-5">
                <Skeleton className="h-[500px] rounded-2xl bg-zinc-900/40 lg:col-span-3" />
                <Skeleton className="h-[500px] rounded-2xl bg-zinc-900/40 lg:col-span-2" />
            </div>
        </div>
    );
}

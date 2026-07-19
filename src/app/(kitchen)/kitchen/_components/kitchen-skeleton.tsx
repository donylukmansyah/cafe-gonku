export function KitchenPageSkeleton() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary/30">
            {/* Navbar Placeholder */}
            <header className="h-[72px] bg-zinc-950 border-b border-zinc-900/80 px-6 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-900" />
                    <div className="space-y-1.5">
                        <div className="h-5 w-36 bg-zinc-900 rounded" />
                        <div className="h-3 w-24 bg-zinc-900 rounded" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-9 w-20 bg-zinc-900 rounded-xl" />
                    <div className="h-9 w-9 bg-zinc-900 rounded-xl" />
                    <div className="h-9 w-24 bg-zinc-900 rounded-xl" />
                </div>
            </header>

            {/* Stats Bar Placeholder */}
            <div className="bg-zinc-950/40 border-b border-zinc-900 py-4 px-6 animate-pulse">
                <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center flex-wrap gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-10 w-32 bg-zinc-900 rounded-xl" />
                        ))}
                    </div>
                    <div className="h-4 w-40 bg-zinc-900 rounded" />
                </div>
            </div>

            <main className="p-6 max-w-[1800px] mx-auto space-y-6 animate-pulse">
                {/* Tabs Bar Placeholder */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/40 p-2 rounded-2xl border border-zinc-800/80">
                    <div className="h-12 w-full sm:w-[480px] bg-zinc-900 rounded-xl" />
                    <div className="h-10 w-32 bg-zinc-900 rounded-xl self-end sm:self-auto" />
                </div>

                {/* Queue Cards Grid Placeholder */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="bg-zinc-950/60 border border-zinc-900 rounded-2xl overflow-hidden p-5 space-y-4"
                        >
                            <div className="h-1.5 w-full bg-zinc-900 rounded-full" />
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 shrink-0" />
                                    <div className="space-y-2">
                                        <div className="h-5 w-24 bg-zinc-900 rounded" />
                                        <div className="h-3.5 w-20 bg-zinc-900 rounded" />
                                    </div>
                                </div>
                                <div className="h-6 w-20 bg-zinc-900 rounded-full" />
                            </div>
                            <div className="space-y-2.5">
                                {[1, 2].map((j) => (
                                    <div key={j} className="flex items-start gap-3.5 p-3.5 bg-zinc-900/20 rounded-xl border border-zinc-900/50">
                                        <div className="w-9 h-9 bg-zinc-900 rounded-lg shrink-0" />
                                        <div className="flex-1 space-y-2 py-1">
                                            <div className="h-4 w-3/4 bg-zinc-900 rounded" />
                                            <div className="h-3 w-1/2 bg-zinc-900 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="h-12 w-full bg-zinc-900 rounded-xl" />
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

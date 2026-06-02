"use client";

import { useEffect, useRef, useState, useCallback, useMemo, Suspense } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, UtensilsCrossed, MonitorPlay, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppToaster } from "@/components/ui/app-toaster";

// Hooks
import { useKitchenOrders } from "@/hooks/use-kitchen-orders";
import { useKitchenMenus } from "@/hooks/use-kitchen-menus";

// Components
import { KitchenNavbar } from "@/components/kitchen/kitchen-navbar";
import { KitchenStatsBar } from "@/components/kitchen/kitchen-stats-bar";
import { OrderQueue } from "@/components/kitchen/order-queue";
import { MenuAvailability } from "@/components/kitchen/menu-availability";
import { DailyCashPanel } from "@/components/kitchen/daily-cash-panel";

// High-Fidelity Page-Level Skeleton Loader
function KitchenPageSkeleton() {
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

function KitchenDashboardContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [soundEnabled, setSoundEnabled] = useState(true);
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Sync tab with URL search parameter ?page=
    const pageParam = searchParams.get("page");
    const activeTab = useMemo(() => {
        if (pageParam === "2" || pageParam === "menu") return "menu";
        if (pageParam === "3" || pageParam === "cash") return "cash";
        return "queue";
    }, [pageParam]);

    const handleTabChange = useCallback((value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "queue") {
            params.set("page", "1");
        } else if (value === "menu") {
            params.set("page", "2");
        } else if (value === "cash") {
            params.set("page", "3");
        }
        router.push(`/kitchen?${params.toString()}`);
    }, [router, searchParams]);

    // Memoize options to prevent identity change on every render
    const kitchenOrdersOptions = useMemo(() => ({
        soundEnabled,
        audioRef,
    }), [soundEnabled, audioRef]);

    // Custom hooks for data management
    const {
        orders,
        paidOrders,
        preparingOrders,
        readyOrders,
        showHistory,
        setShowHistory,
        isLoading: isLoadingOrders,
        isUpdating,
        lastUpdated,
        fetchOrders,
        updateOrderStatus,
        startPolling,
    } = useKitchenOrders(kitchenOrdersOptions);

    const {
        menus,
        groupedMenus,
        isLoading: isLoadingMenus,
        fetchMenus,
        toggleAvailability,
        initialize: initializeMenus,
    } = useKitchenMenus();

    // Initialization correctly handles cleanup
    useEffect(() => {
        const cleanupOrders = startPolling();
        const cleanupMenus = initializeMenus();

        return () => {
            cleanupOrders();
            cleanupMenus();
        };
    }, [startPolling, initializeMenus, soundEnabled]);

    // Stable event handlers
    const handleStatusChange = useCallback(async (orderId: string | string[], newStatus: string) => {
        try {
            return await updateOrderStatus(orderId, newStatus);
        } catch {
            toast.error("Gagal mengupdate status order");
            return false;
        }
    }, [updateOrderStatus]);

    const handleMenuToggle = useCallback(async (menuId: string, isAvailable: boolean) => {
        return await toggleAvailability(menuId, isAvailable);
    }, [toggleAvailability]);

    const handleRefresh = useCallback(() => {
        fetchOrders();
        fetchMenus();
        toast.success("Data diperbarui");
    }, [fetchOrders, fetchMenus]);

    const handleSoundToggle = useCallback(() => {
        setSoundEnabled((prev) => !prev);
    }, []);

    const handleLogout = useCallback(async () => {
        await signOut();
        router.push("/login");
        router.refresh();
    }, [router]);

    const handleTestSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play()
                .then(() => toast.success("Suara notifikasi berfungsi"))
                .catch((err) => {
                    console.error("Test sound failed:", err);
                    toast.error("Gagal memutar suara. Coba klik dashboard lalu tes lagi.");
                });
        }
    }, []);

    // Interaction required for audio unlock
    const handleAudioUnlock = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
                if (audioRef.current) audioRef.current.currentTime = 0;
            }).catch((error) => console.error("Unlock failed silently:", error));
        }
        setAudioUnlocked(true);
    }, []);

    // Session is guaranteed by the layout protecting this page
    const user = session?.user as { role?: string; name?: string; email?: string } | undefined;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary/30">
            <AppToaster position="top-right" />

            {/* Hidden audio element */}
            <audio ref={audioRef} src="/notif/new-order.wav" preload="auto" />

            {!audioUnlocked && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-300">
                    <div className="text-center space-y-4">
                        <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <MonitorPlay className="w-12 h-12 text-primary" />
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-widest text-white">Mulai Sesi Dapur</h1>
                        <p className="text-zinc-400 max-w-md mx-auto text-sm leading-relaxed">
                            Browser membutuhkan interaksi sebelum mengizinkan notifikasi suara berbunyi otomatis. Klik tombol di bawah untuk memulai.
                        </p>
                    </div>
                    <Button
                        size="lg"
                        onClick={handleAudioUnlock}
                        className="bg-primary text-black font-black uppercase tracking-widest px-12 py-8 rounded-full text-lg hover:scale-105 transition-all shadow-[0_0_40px_rgba(53,183,24,0.3)] hover:shadow-[0_0_60px_rgba(53,183,24,0.5)]"
                    >
                        Aktifkan Dashboard
                    </Button>
                </div>
            )}

            {/* UI Shell */}
            <KitchenNavbar
                userName={user?.name || user?.email || "Kitchen Staff"}
                soundEnabled={soundEnabled}
                onSoundToggle={handleSoundToggle}
                onRefresh={handleRefresh}
                onLogout={handleLogout}
                onTestSound={handleTestSound}
            />

            <KitchenStatsBar
                paidCount={paidOrders.length}
                preparingCount={preparingOrders.length}
                readyCount={readyOrders.length}
                lastUpdated={lastUpdated}
            />

            <main className="p-6 max-w-[1800px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/40 p-2.5 rounded-3xl border border-zinc-800/80 backdrop-blur-md shadow-2xl">
                        <TabsList className="bg-zinc-950 border border-zinc-800 p-1.5 h-auto w-full sm:w-auto justify-start rounded-2xl flex flex-col sm:flex-row gap-1">
                            <TabsTrigger
                                value="queue"
                                className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 font-black cursor-pointer px-8 py-3 transition-all text-xs rounded-xl uppercase tracking-wider flex items-center justify-center w-full sm:w-auto"
                            >
                                <ChefHat className="w-4 h-4 mr-2" />
                                Pesanan Aktif
                            </TabsTrigger>
                            <TabsTrigger
                                value="menu"
                                className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 font-black cursor-pointer px-8 py-3 transition-all text-xs rounded-xl uppercase tracking-wider flex items-center justify-center w-full sm:w-auto"
                            >
                                <UtensilsCrossed className="w-4 h-4 mr-2" />
                                Status Menu
                            </TabsTrigger>
                            <TabsTrigger
                                value="cash"
                                className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 font-black cursor-pointer px-8 py-3 transition-all text-xs rounded-xl uppercase tracking-wider flex items-center justify-center w-full sm:w-auto"
                            >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Pendapatan di Kasir
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === "queue" && (
                            <div className="flex items-center gap-3.5 px-4 py-2.5 bg-zinc-950/80 rounded-2xl border border-zinc-800 self-end sm:self-auto shadow-lg shadow-black/40">
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${!showHistory ? "text-primary shadow-[0_0_10px_rgba(53,183,24,0.4)]" : "text-zinc-600"}`}>LIVE</span>
                                <div
                                    onClick={() => setShowHistory(!showHistory)}
                                    className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-all duration-300 relative border border-zinc-700/50 ${showHistory ? "bg-primary" : "bg-zinc-900"}`}
                                >
                                    <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform duration-300 shadow-md ${showHistory ? "translate-x-6" : "translate-x-0"}`} />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${showHistory ? "text-primary shadow-[0_0_10px_rgba(53,183,24,0.4)]" : "text-zinc-600"}`}>HISTORY</span>
                            </div>
                        )}
                    </div>

                    <TabsContent value="queue" className="mt-0 outline-none">
                        <OrderQueue
                            orders={orders}
                            isLoading={isLoadingOrders}
                            isUpdating={isUpdating}
                            onStatusChange={handleStatusChange}
                            showHistory={showHistory}
                        />
                    </TabsContent>

                    <TabsContent value="menu" className="mt-0 outline-none">
                        <MenuAvailability
                            menus={menus}
                            groupedMenus={groupedMenus}
                            onToggle={handleMenuToggle}
                            isLoading={isLoadingMenus}
                        />
                    </TabsContent>

                    <TabsContent value="cash" className="mt-0 outline-none">
                        <DailyCashPanel />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

export default function KitchenPage() {
    return (
        <Suspense fallback={<KitchenPageSkeleton />}>
            <KitchenDashboardContent />
        </Suspense>
    );
}

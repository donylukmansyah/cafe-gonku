"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, UtensilsCrossed, MonitorPlay, ShoppingCart } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";

// Hooks
import { useKitchenOrders } from "@/hooks/use-kitchen-orders";
import { useKitchenMenus } from "@/hooks/use-kitchen-menus";

// Components
import { KitchenNavbar } from "@/components/kitchen/kitchen-navbar";
import { KitchenStatsBar } from "@/components/kitchen/kitchen-stats-bar";
import { OrderQueue } from "@/components/kitchen/order-queue";
import { MenuAvailability } from "@/components/kitchen/menu-availability";
import { DailyCashPanel } from "@/components/kitchen/daily-cash-panel";

export default function KitchenPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [soundEnabled, setSoundEnabled] = useState(true);
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const [activeTab, setActiveTab] = useState("queue");
    const audioRef = useRef<HTMLAudioElement>(null);

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
                .then(() => toast.success("Suara notifikasi berfungsi! 🔊"))
                .catch((err) => {
                    console.error("Test sound failed:", err);
                    toast.error("Gagal memutar suara. Coba klik dashboard lalu tes lagi.");
                });
        }
    }, []);

    // Interaction required for audio unlock
    const handleAudioUnlock = useCallback(() => {
        if (audioRef.current) {
            // Play and immediately pause to register initial user interaction with the media element
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
            <Toaster position="top-right" theme="dark" richColors />

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
                        className="bg-primary text-black font-black uppercase tracking-widest px-12 py-8 rounded-full text-lg hover:scale-105 transition-all shadow-[0_0_40px_rgba(46,254,60,0.3)] hover:shadow-[0_0_60px_rgba(46,254,60,0.5)]"
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
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/40 p-2 rounded-2xl border border-zinc-800">
                        <TabsList className="bg-zinc-900 border border-zinc-700/50 p-1 h-auto w-full sm:w-auto justify-start">
                            <TabsTrigger
                                value="queue"
                                className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold cursor-pointer px-8 py-2.5 transition-all text-sm"
                            >
                                <ChefHat className="w-4 h-4 mr-2" />
                                Pesanan Aktif
                            </TabsTrigger>
                            <TabsTrigger
                                value="menu"
                                className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold cursor-pointer px-8 py-2.5 transition-all text-sm"
                            >
                                <UtensilsCrossed className="w-4 h-4 mr-2" />
                                Status Menu
                            </TabsTrigger>
                            <TabsTrigger
                                value="cash"
                                className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold cursor-pointer px-8 py-2.5 transition-all text-sm"
                            >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Kas Harian
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === "queue" && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-xl border border-zinc-800 self-end sm:self-auto">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${!showHistory ? "text-primary/70" : "text-zinc-600"}`}>LIVE</span>
                                <div
                                    onClick={() => setShowHistory(!showHistory)}
                                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 relative ${showHistory ? "bg-primary" : "bg-zinc-800"}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${showHistory ? "translate-x-6" : "translate-x-0"}`} />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${showHistory ? "text-primary/70" : "text-zinc-600"}`}>HISTORY</span>
                            </div>
                        )}
                    </div>

                    <TabsContent value="queue" className="mt-0 outline-none">
                        <OrderQueue
                            orders={orders}
                            isLoading={isLoadingOrders}
                            isUpdating={isUpdating}
                            onStatusChange={handleStatusChange}
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

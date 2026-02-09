"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, UtensilsCrossed } from "lucide-react";
import { toast, Toaster } from "sonner";

// Hooks
import { useKitchenOrders } from "@/hooks/use-kitchen-orders";
import { useKitchenMenus } from "@/hooks/use-kitchen-menus";

// Components
import { KitchenNavbar } from "@/components/kitchen/kitchen-navbar";
import { KitchenStatsBar } from "@/components/kitchen/kitchen-stats-bar";
import { OrderQueue } from "@/components/kitchen/order-queue";
import { MenuAvailability } from "@/components/kitchen/menu-availability";

export default function KitchenPage() {
    const { data: session, isPending } = useSession();
    const router = useRouter();

    const [soundEnabled, setSoundEnabled] = useState(true);
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
    const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
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

    // Loading state
    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center shadow-2xl">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                    <p className="text-zinc-500 font-medium">Memuat Database...</p>
                </div>
            </div>
        );
    }

    // Auth check
    const user = session?.user as { role?: string; name?: string; email?: string } | undefined;
    if (!session || (user?.role !== "KITCHEN" && user?.role !== "ADMIN")) {
        router.push("/login");
        return null;
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary/30">
            <Toaster position="top-right" theme="dark" richColors />

            {/* Hidden audio element */}
            <audio ref={audioRef} src="/notif/new-order.wav" preload="auto" />

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
                </Tabs>
            </main>
        </div>
    );
}

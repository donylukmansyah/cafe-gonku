"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

interface OrderItem {
    id: string;
    quantity: number;
    price: number;
    notes: string | null;
    menu: {
        id: string;
        name: string;
        category: string;
    };
    selectedOptions: {
        id: string;
        optionName: string;
        optionValue: string;
        priceAdjust: number;
    }[];
}

export interface Order {
    id: string;
    orderCode: string;
    status: "PENDING" | "PAID" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
    paidAt: string | null;
    createdAt: string;
    totalAmount: number;
    table: {
        id: string;
        tableNumber: number;
    };
    orderItems: OrderItem[];
}

interface UseKitchenOrdersOptions {
    pollingInterval?: number;
    soundEnabled?: boolean;
    audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export function useKitchenOrders(options: UseKitchenOrdersOptions = {}) {
    const { soundEnabled = true, audioRef } = options;

    const [orders, setOrders] = useState<Order[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [error, setError] = useState<string | null>(null);

    const soundedOrdersRef = useRef<Set<string>>(new Set());
    const lastDataHashRef = useRef(""); // Track data hash to prevent re-renders
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    // Helper to generate a simple hash of the orders to detect changes
    const getOrdersHash = (orders: Order[], history: boolean) => {
        return `${history}-${orders.map(o => `${o.id}-${o.status}-${o.paidAt ?? ""}`).join("|")}`;
    };

    const playNotification = useCallback(() => {
        if (audioRef?.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch((err) => {
                console.warn("[Audio] Playback failed/blocked:", err);
                toast.error("Notifikasi suara terblokir browser. Klik layar dashboard untuk mengaktifkan! 🔊", {
                    description: "Browser butuh interaksi user sebelum memutar suara.",
                    duration: 8000
                });
            });
        }
    }, [audioRef]);

    const fetchOrders = useCallback(async (isManual = false, historyOverride?: boolean) => {
        if (!isMountedRef.current || isFetchingRef.current) return;

        isFetchingRef.current = true;
        const historyFlag = historyOverride !== undefined ? historyOverride : showHistory;

        try {
            const data = await apiFetch<{ orders: Order[] }>(`/api/orders?includeServed=${historyFlag}`, {
                silent: !isManual
            });

            if (!isMountedRef.current) return;

            const newOrders = data.orders;
            const newHash = getOrdersHash(newOrders, historyFlag);

            // Only update state if data actually changed
            if (newHash !== lastDataHashRef.current || isManual) {
                // On initial load (when soundedOrdersRef is empty), mark existing orders as sounded
                // to prevent notification splash on login/refresh
                if (soundedOrdersRef.current.size === 0 && newOrders.length > 0) {
                    newOrders.forEach(o => soundedOrdersRef.current.add(o.orderCode));
                }

                // Check for NEW Paid orders that haven't played sound yet (for polling fallback)
                if (soundEnabled && audioRef?.current) {
                    newOrders.forEach(order => {
                        if (order.status === "PAID" && !soundedOrdersRef.current.has(order.orderCode)) {
                            console.log(`[Polling] Triggering sound for NEW order: ${order.orderCode}`);
                            playNotification();
                            soundedOrdersRef.current.add(order.orderCode);
                        }
                    });
                }

                lastDataHashRef.current = newHash;
                setOrders(newOrders);
                setLastUpdated(new Date());
            }

            setError(null);
        } catch (err) {
            if (!isMountedRef.current) return;
            setError("Gagal memuat orders");
        } finally {
            isFetchingRef.current = false;
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [soundEnabled, audioRef, showHistory, playNotification]);

    const updateOrdersStatus = useCallback(
        async (orderIds: string[], newStatus: string) => {
            setIsUpdating(true);

            // Optimistic update
            setOrders((prev) =>
                prev.map((order) =>
                    orderIds.includes(order.id)
                        ? { ...order, status: newStatus as Order["status"] }
                        : order
                )
            );

            try {
                const promises = orderIds.map(orderId =>
                    apiFetch(`/api/orders/${orderId}/status`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: newStatus }),
                    })
                );

                await Promise.all(promises);
                await fetchOrders(true);
                return true;
            } catch (err) {
                await fetchOrders(true);
                throw err;
            } finally {
                setIsUpdating(false);
            }
        },
        [fetchOrders]
    );

    const syncPendingOrders = useCallback(async () => {
        if (!isMountedRef.current) return;
        try {
            await apiFetch("/api/orders/sync-payment", { method: "POST", silent: true });
        } catch (err) {
            console.error("Sync error:", err);
        }
    }, []);

    const startPolling = useCallback(() => {
        isMountedRef.current = true;
        fetchOrders();
        syncPendingOrders();

        const channel = supabase
            .channel("kitchen-updates")
            .on("broadcast", { event: "refresh-orders" }, (payload) => {
                const data = payload.payload;
                const status = data?.status;
                const orderId = data?.orderId;
                const isPayment = status === "PAID";
                const isNewPaidOrder = isPayment && !soundedOrdersRef.current.has(orderId);
                const fullOrder = data?.fullOrder;

                console.log(`[Payment Pipeline] ${new Date().toISOString()} - Kitchen receive broadcast for ${orderId}: ${status}`);

                if (isNewPaidOrder) {
                    if (soundEnabled) {
                        playNotification();
                    }
                    if (orderId) soundedOrdersRef.current.add(orderId);
                    toast.success(`Pesanan Masuk: ${orderId} 🔔`, {
                        description: "Sudah bayar! Segera cek daftar Pesanan Aktif.",
                        duration: 10000,
                    });
                }

                if (data?.orderId && data?.status) {
                    if (data.status === "PENDING") return;

                    if (fullOrder && isPayment) {
                        // Instant State Injection for new Paid Orders
                        setOrders(prev => {
                            const exists = prev.some(o => o.orderCode === data.orderId);
                            if (exists) {
                                // If it exists, just update the status (idempotent)
                                return prev.map(o => o.orderCode === data.orderId ? { ...o, status: data.status, ...fullOrder } : o);
                            }
                            // Inject brand new order from broadcast payload!
                            return [...prev, fullOrder].sort((a, b) => new Date(a.paidAt || a.createdAt).getTime() - new Date(b.paidAt || b.createdAt).getTime());
                        });
                    } else {
                        // Fallback for status updates (PREPARING, READY, etc) 
                        setOrders((prev) => {
                            const existing = prev.find(o => o.orderCode === data.orderId);
                            if (!existing) {
                                // Important: We ONLY initiate a fetch request for missing non-paid orders.
                                // If we don't have it, we must fetch it. However, we schedule this OUTSIDE of the setOrders callback using setTimeout to avoid React warnings.
                                setTimeout(() => fetchOrders(true), 0);
                                return prev;
                            }
                            return prev.map(o =>
                                o.orderCode === data.orderId
                                    ? { ...o, status: data.status }
                                    : o
                            );
                        });
                    }
                } else {
                    // Fallback for empty payload
                    fetchOrders(true);
                }
            })
            .subscribe();

        pollingRef.current = setInterval(() => {
            if (document.visibilityState === "visible") fetchOrders();
        }, 10000); // Increased to 10s for better balance (still feels live)

        const syncInterval = setInterval(() => {
            syncPendingOrders();
        }, 60000); // Increased to 60s (Midtrans sync isn't that urgent)

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                fetchOrders();
                syncPendingOrders();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            isMountedRef.current = false;
            supabase.removeChannel(channel);
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (syncInterval) clearInterval(syncInterval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [fetchOrders, syncPendingOrders, soundEnabled, playNotification]);

    const groupedOrders = useMemo(
        () => ({
            paidOrders: orders.filter((o) => o.status === "PAID"),
            preparingOrders: orders.filter((o) => o.status === "PREPARING"),
            readyOrders: orders.filter((o) => o.status === "READY"),
        }),
        [orders]
    );

    return {
        orders,
        ...groupedOrders,
        showHistory,
        setShowHistory: (val: boolean) => {
            setShowHistory(val);
            fetchOrders(true, val);
        },
        isLoading,
        isUpdating,
        lastUpdated,
        error,
        fetchOrders: () => fetchOrders(true),
        updateOrderStatus: (idOrIds: string | string[], status: string) =>
            updateOrdersStatus(Array.isArray(idOrIds) ? idOrIds : [idOrIds], status),
        updateOrdersStatus,
        startPolling,
    };
}

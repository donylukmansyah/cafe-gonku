"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/shared/client/supabase";
import { toast } from "sonner";
import { apiFetch } from "@/shared/client/api-client";
import { REALTIME_CHANNELS } from "@/shared/realtime-channels";
import { logger } from "@/shared/logger";

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
    serviceType: "DINE_IN" | "TAKEAWAY";
    priorityScore: number;
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
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
                logger.warn("[Audio] Playback failed/blocked:", err);
                toast.error("Notifikasi suara terblokir browser. Klik layar dashboard untuk mengaktifkan.", {
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
                            logger.debug(`[Polling] Triggering sound for NEW order: ${order.orderCode}`);
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
        } catch {
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
                await apiFetch("/api/orders/bulk-status", {
                    method: "PATCH",
                    body: JSON.stringify({ orderIds, status: newStatus }),
                });
                await fetchOrders(true);
                return true;
            } catch (error) {
                await fetchOrders(true);
                throw error;
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
            logger.error("Sync error:", err);
        }
    }, []);

    const startPolling = useCallback(() => {
        isMountedRef.current = true;
        fetchOrders();
        syncPendingOrders();

        const channel = supabase
            .channel(REALTIME_CHANNELS.kitchenUpdates)
            .on("broadcast", { event: "refresh-orders" }, (payload) => {
                const data = payload.payload;
                const orderCode = typeof data?.orderCode === "string" ? data.orderCode : data?.orderId;
                const orderStatus = data?.orderStatus ?? data?.status;
                const paymentStatus = data?.paymentStatus;
                const isPaymentPaid = paymentStatus === "PAID" || data?.status === "PAID";
                const isNewPaidOrder = isPaymentPaid && typeof orderCode === "string" && !soundedOrdersRef.current.has(orderCode);
                const fullOrder = data?.fullOrder as Order | undefined;

                logger.debug(`[Payment Pipeline] ${new Date().toISOString()} - Kitchen receive broadcast for ${orderCode}: ${orderStatus}/${paymentStatus ?? "UNKNOWN"}`);

                if (isNewPaidOrder) {
                    if (soundEnabled) {
                        playNotification();
                    }
                    soundedOrdersRef.current.add(orderCode);
                    toast.success(`Pesanan Masuk: ${orderCode}`, {
                        description: "Sudah bayar! Segera cek daftar Pesanan Aktif.",
                        duration: 10000,
                    });
                }

                if (typeof orderCode === "string" && typeof orderStatus === "string") {
                    if (orderStatus === "PENDING") return;

                    if (fullOrder && isPaymentPaid) {
                        setOrders(prev => {
                            const exists = prev.some(o => o.orderCode === orderCode);
                            if (exists) {
                                return prev.map(o => o.orderCode === orderCode ? { ...o, ...fullOrder, status: fullOrder.status ?? orderStatus } : o);
                            }
                            return [...prev, fullOrder].sort((a, b) => {
                                if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
                                return new Date(a.paidAt || a.createdAt).getTime() - new Date(b.paidAt || b.createdAt).getTime();
                            });
                        });
                    } else {
                        setOrders((prev) => {
                            const existing = prev.find(o => o.orderCode === orderCode);
                            if (!existing) {
                                setTimeout(() => fetchOrders(true), 0);
                                return prev;
                            }
                            return prev.map(o =>
                                o.orderCode === orderCode
                                    ? { ...o, status: orderStatus as Order["status"] }
                                    : o
                            );
                        });
                    }
                } else {
                    fetchOrders(true);
                }
            })
            .subscribe();


        pollingRef.current = setInterval(() => {
            if (document.visibilityState === "visible") fetchOrders();
        }, 10000); // Increased to 10s for better balance (still feels live)

        const syncInterval = setInterval(() => {
            syncPendingOrders();
        }, 60000); // Payment gateway sync is not that urgent

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

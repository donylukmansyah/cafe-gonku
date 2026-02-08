"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";

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
    status: "PAID" | "PREPARING" | "READY" | "SERVED";
    paidAt: string;
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
    const { pollingInterval = 15000, soundEnabled = true, audioRef } = options;

    const [orders, setOrders] = useState<Order[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [error, setError] = useState<string | null>(null);

    const lastOrderCountRef = useRef(0);
    const lastDataHashRef = useRef(""); // Track data hash to prevent re-renders
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    // Helper to generate a simple hash of the orders to detect changes
    const getOrdersHash = (orders: Order[], history: boolean) => {
        return `${history}-${orders.map(o => `${o.id}-${o.status}`).join("|")}`;
    };

    const fetchOrders = useCallback(async (isManual = false, historyOverride?: boolean) => {
        if (!isMountedRef.current || isFetchingRef.current) return;

        isFetchingRef.current = true;
        const historyFlag = historyOverride !== undefined ? historyOverride : showHistory;

        try {
            const res = await fetch(`/api/orders?includeServed=${historyFlag}`);
            if (!res.ok) throw new Error("Failed to fetch orders");
            const data = await res.json();

            if (!isMountedRef.current) return;

            const newOrders = data.orders as Order[];
            const newHash = getOrdersHash(newOrders, historyFlag);

            // Only update state if data actually changed
            if (newHash !== lastDataHashRef.current || isManual) {
                // Sound notification check (only on polling/initial additions & NOT in history mode)
                if (
                    !historyFlag &&
                    newOrders.length > lastOrderCountRef.current &&
                    lastOrderCountRef.current > 0 &&
                    soundEnabled &&
                    audioRef?.current
                ) {
                    audioRef.current.play().catch(() => { });
                }

                if (!historyFlag) {
                    lastOrderCountRef.current = newOrders.length;
                }

                lastDataHashRef.current = newHash;
                setOrders(newOrders);
                setLastUpdated(new Date());
            }

            setError(null);
        } catch (err) {
            if (!isMountedRef.current) return;
            console.error("Error fetching orders:", err);
            setError("Gagal memuat orders");
        } finally {
            isFetchingRef.current = false;
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [soundEnabled, audioRef, showHistory]);

    const updateOrderStatus = useCallback(
        async (orderId: string, newStatus: string) => {
            setIsUpdating(true);

            // Optimistic update
            setOrders((prev) =>
                prev.map((order) =>
                    order.id === orderId
                        ? { ...order, status: newStatus as Order["status"] }
                        : order
                )
            );

            try {
                const res = await fetch(`/api/orders/${orderId}/status`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: newStatus }),
                });

                if (!res.ok) {
                    await fetchOrders(true);
                    throw new Error("Failed to update order status");
                }

                // Manual fetch to sync server state and update hash
                await fetchOrders(true);
                return true;
            } catch (err) {
                console.error("Error updating order:", err);
                throw err;
            } finally {
                setIsUpdating(false);
            }
        },
        [fetchOrders]
    );

    const startPolling = useCallback(() => {
        isMountedRef.current = true;
        fetchOrders();

        // --- Supabase Realtime Broadcast ---
        // Since DB is on Neon, we use Broadcast to signal updates
        const channel = supabase
            .channel("kitchen-updates")
            .on("broadcast", { event: "refresh-orders" }, () => {
                console.log("[Supabase] Realtime refresh signal received");
                fetchOrders(true);
            })
            .subscribe();

        const poll = () => {
            if (document.visibilityState === "visible") {
                fetchOrders();
            }
        };

        // Fallback polling (slower, for safety)
        pollingRef.current = setInterval(poll, 60000); // Check every 1 minute as fallback

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                fetchOrders();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            isMountedRef.current = false;
            supabase.removeChannel(channel);
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [fetchOrders]);

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
        updateOrderStatus,
        startPolling,
    };
}

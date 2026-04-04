"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";
import { apiFetch } from "@/lib/api-client";
import { REALTIME_CHANNELS } from "@/lib/realtime-channels";

export interface OrderDetails {
    id: string;
    orderCode: string;
    status: "PENDING" | "PAID" | "PREPARING" | "READY" | "SERVED" | "CANCELLED" | "EXPIRED";
    paymentStatus: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
    midtransToken?: string;
    totalAmount: number;
    createdAt: string;
    customerName?: string;
    table: {
        tableNumber: number;
    };
    orderItems: {
        id: string;
        quantity: number;
        price: number;
        notes?: string | null;
        menu: {
            name: string;
        };
        selectedOptions: {
            optionName?: string;
            optionValue: string;
            priceAdjust: number;
        }[];
    }[];
}

export function useRealtimeOrder() {
    const activeOrderCode = useCart((state) => state.activeOrderCode);
    const setActiveOrderCode = useCart((state) => state.setActiveOrderCode);

    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const isMounted = useRef(true);

    const fetchOrder = useCallback(async (showLoading = false) => {
        if (!activeOrderCode) return;

        if (showLoading) setIsLoading(true);

        try {
            const orderData = await apiFetch<OrderDetails>(`/api/orders/${activeOrderCode}`, { silent: true });

            if (isMounted.current) {
                setOrder(orderData);

                // If order is completed/cancelled, we might want to stop polling?
                // But for now let's keep it simple.
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message.toLowerCase() : "";
            if (msg.includes("not found")) {
                setActiveOrderCode(null);
                setOrder(null);
            } else {
                console.error("Error fetching order:", error);
            }
        } finally {
            if (isMounted.current && showLoading) setIsLoading(false);
        }
    }, [activeOrderCode, setActiveOrderCode]);

    // Initial Fetch & Real-time Subscription
    useEffect(() => {
        isMounted.current = true;
        if (!activeOrderCode) {
            setOrder(null);
            return;
        }

        // Initial fetch
        fetchOrder(true);

        console.log(`[Supabase] Subscribing to ${REALTIME_CHANNELS.order(activeOrderCode)}`);

        // --- Supabase Realtime Subscription ---
        const channel = supabase
            .channel(REALTIME_CHANNELS.order(activeOrderCode))
            .on("broadcast", { event: "refresh-orders" }, (payload) => {
                console.log("[Supabase] Order update received:", payload);
                const data = payload.payload;

                if (data?.orderId === activeOrderCode) {
                    // ZERO-DELAY UPDATE: If payload has status, update local state instantly
                    if (data.status) {
                        setOrder(prev => {
                            if (!prev) return prev;
                            // Only update if status actually changed to avoid unnecessary re-renders
                            if (prev.status === data.status) return prev;

                            return {
                                ...prev,
                                status: data.status,
                                // If status is PAID, also update paymentStatus for UI consistency
                                paymentStatus: data.status === "PAID" ? "PAID" : prev.paymentStatus
                            };
                        });
                        toast.info(`Status pesanan: ${data.status} ✨`);
                    } else {
                        // Fallback to fetch if payload is incomplete
                        fetchOrder();
                    }
                }
            })
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.log(`[Supabase] Connected to ${REALTIME_CHANNELS.order(activeOrderCode)}`);
                }
            });

        // --- Fallback Polling (30s) ---
        const pollInterval = setInterval(() => {
            fetchOrder();
        }, 30000);
        return () => {
            isMounted.current = false;
            clearInterval(pollInterval);
            supabase.removeChannel(channel);
        };
    }, [activeOrderCode, fetchOrder]);

    // Fallback Effect for Payment Polling (Very relaxed, only if strictly necessary)
    // We only need a safety net if the user closed the window before `onSuccess` fired 
    // and the webhook is taking an extremely long time.
    useEffect(() => {
        if (!activeOrderCode || order?.paymentStatus !== "PENDING") return;

        console.log("[Payment] Starting relaxed safety net check loop...");
        const interval = setInterval(async () => {
            try {
                // Relaxed interval (15s) since proactive check handles the Happy Path instantly
                const data = await apiFetch<{ updated?: boolean }>(`/api/orders/${activeOrderCode}/check-payment`, {
                    method: "POST",
                    silent: true,
                });
                if (data.updated && isMounted.current) {
                    toast.success("Pembayaran terkonfirmasi! ✨");
                    fetchOrder(); // This will update order state -> triggers cleanup
                }
            } catch (e) {
                console.error("Safety check error:", e);
            }
        }, 15000);

        return () => clearInterval(interval);
    }, [activeOrderCode, order?.paymentStatus, fetchOrder]);

    return {
        order,
        isLoading,
        refresh: () => fetchOrder(true),
        activeOrderCode
    };
}

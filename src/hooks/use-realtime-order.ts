"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";
import { apiFetch } from "@/lib/api-client";
import { REALTIME_CHANNELS } from "@/lib/realtime-channels";
import { useLiveRefetch } from "@/hooks/use-live-refetch";

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
    const getOrderAccessToken = useCart((state) => state.getOrderAccessToken);

    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const isMounted = useRef(true);

    // Stabilize Zustand selectors with refs to prevent useCallback/useEffect re-triggers.
    // These functions change reference on every render from Zustand, but their behavior is stable.
    const getOrderAccessTokenRef = useRef(getOrderAccessToken);
    getOrderAccessTokenRef.current = getOrderAccessToken;
    const setActiveOrderCodeRef = useRef(setActiveOrderCode);
    setActiveOrderCodeRef.current = setActiveOrderCode;

    const fetchOrder = useCallback(async (showLoading = false) => {
        if (!activeOrderCode) return;

        if (showLoading) setIsLoading(true);

        try {
            const token = getOrderAccessTokenRef.current(activeOrderCode);
            const headers: Record<string, string> = {};
            if (token) {
                headers["x-order-token"] = token;
            }

            const orderData = await apiFetch<OrderDetails>(`/api/orders/${activeOrderCode}`, {
                silent: true,
                headers,
            });

            if (isMounted.current) {
                setOrder(orderData);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message.toLowerCase() : "";
            if (msg.includes("not found")) {
                setActiveOrderCodeRef.current(null);
                setOrder(null);
            } else {
                console.error("Error fetching order:", error);
            }
        } finally {
            if (isMounted.current && showLoading) setIsLoading(false);
        }
    }, [activeOrderCode]);

    // Store fetchOrder in ref so effects can call latest version without re-subscribing
    const fetchOrderRef = useRef(fetchOrder);
    fetchOrderRef.current = fetchOrder;

    // Initial Fetch & Real-time Subscription
    useEffect(() => {
        isMounted.current = true;
        if (!activeOrderCode) {
            setOrder(null);
            return;
        }

        // Initial fetch
        fetchOrderRef.current(true);

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
                        toast.info(`Status pesanan: ${data.status}`);
                    } else {
                        // Fallback to fetch if payload is incomplete
                        fetchOrderRef.current();
                    }
                }
            })
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.log(`[Supabase] Connected to ${REALTIME_CHANNELS.order(activeOrderCode)}`);
                    fetchOrderRef.current();
                }
            });

        return () => {
            isMounted.current = false;
            supabase.removeChannel(channel);
        };
    }, [activeOrderCode]);

    const shouldLiveRefetch =
        Boolean(activeOrderCode) &&
        order?.status !== "SERVED" &&
        order?.status !== "CANCELLED" &&
        order?.status !== "EXPIRED";

    useLiveRefetch({
        enabled: shouldLiveRefetch,
        intervalMs: 5000,
        onRefetch: () => fetchOrderRef.current(),
    });

    useEffect(() => {
        if (!activeOrderCode || order?.paymentStatus !== "PENDING") return;

        let timeout: ReturnType<typeof setTimeout> | null = null;
        let attempt = 0;
        let stopped = false;
        const startedAt = Date.now();

        const getDelay = () => {
            const elapsed = Date.now() - startedAt;
            if (elapsed < 30_000) return 3_000;
            if (elapsed < 120_000) return 10_000;
            return 30_000;
        };

        const checkPayment = async () => {
            if (stopped || !isMounted.current) return;

            try {
                const token = getOrderAccessTokenRef.current(activeOrderCode);
                const headers: Record<string, string> = {};
                if (token) {
                    headers["x-order-token"] = token;
                }

                const data = await apiFetch<{ updated?: boolean }>(`/api/orders/${activeOrderCode}/check-payment`, {
                    method: "POST",
                    silent: true,
                    headers,
                });

                if (data.updated && isMounted.current) {
                    toast.success("Pembayaran terkonfirmasi");
                    fetchOrderRef.current();
                    return;
                }
            } catch (e) {
                console.error("Payment check error:", e);
            }

            attempt += 1;
            if (!stopped && attempt < 30) {
                timeout = setTimeout(checkPayment, getDelay());
            }
        };

        timeout = setTimeout(checkPayment, 3_000);

        return () => {
            stopped = true;
            if (timeout) clearTimeout(timeout);
        };
    }, [activeOrderCode, order?.paymentStatus]);

    const refresh = useCallback(() => fetchOrder(true), [fetchOrder]);

    return {
        order,
        isLoading,
        refresh,
        activeOrderCode
    };
}

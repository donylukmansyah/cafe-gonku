"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";
import { apiFetch } from "@/lib/api-client";

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
        menu: {
            name: string;
        };
        selectedOptions: {
            optionValue: string;
        }[];
    }[];
}

export function useRealtimeOrder() {
    const activeOrderCode = useCart((state) => state.activeOrderCode);
    const setActiveOrderCode = useCart((state) => state.setActiveOrderCode);

    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPolling, setIsPolling] = useState(false);

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
        } catch (error: any) {
            const msg = error.message?.toLowerCase() || "";
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

        console.log(`[Supabase] Subscribing to order-${activeOrderCode}`);

        // --- Supabase Realtime Subscription ---
        const channel = supabase
            .channel(`order-${activeOrderCode}`)
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
                    console.log(`[Supabase] Connected to order-${activeOrderCode}`);
                }
            });

        // --- Fallback Polling (30s) ---
        const pollInterval = setInterval(() => {
            fetchOrder();
        }, 30000);

        // --- Payment Check Loop (If Pending) ---
        // Checks more frequently (5s) if payment is pending
        const paymentCheckInterval: NodeJS.Timeout | null = null;

        // We need to check payment status from the *current* order state or fetch result
        // Since we can't easily access the latest 'order' state inside this effect without adding it to dependency (causing loop),
        // we'll set up a separate effect for payment checking or just always run it if activeOrderCode exists?
        // Better: Separate effect for payment.

        return () => {
            isMounted.current = false;
            clearInterval(pollInterval);
            supabase.removeChannel(channel);
        };
    }, [activeOrderCode, fetchOrder]);

    // Separate Effect for Payment Polling (Depends on order.paymentStatus)
    useEffect(() => {
        if (!activeOrderCode || order?.paymentStatus !== "PENDING") return;

        console.log("[Payment] Starting payment check loop...");
        const interval = setInterval(async () => {
            try {
                const data = await apiFetch<any>(`/api/orders/${activeOrderCode}/check-payment`, { method: "POST", silent: true });
                if (data.updated && isMounted.current) {
                    toast.success("Pembayaran terkonfirmasi! ✨");
                    fetchOrder(); // This will update order state -> triggers cleanup -> stops this loop
                }
            } catch (e) {
                console.error("Check payment error:", e);
            }
        }, 5000); // Check every 5s

        return () => clearInterval(interval);
    }, [activeOrderCode, order?.paymentStatus, fetchOrder]);

    return {
        order,
        isLoading,
        refresh: () => fetchOrder(true),
        activeOrderCode
    };
}

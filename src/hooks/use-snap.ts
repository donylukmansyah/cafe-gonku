"use client";

import { useEffect, useState, useCallback } from "react";

declare global {
    interface Window {
        snap: any;
    }
}

export const useSnap = () => {
    const [snapLoaded, setSnapLoaded] = useState(false);

    useEffect(() => {
        const myMidtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
        const isProduction = false; // TODO: Check via env var if needed, or rely on the script URL choice
        // Ideally we pass this config from specific env var
        // But since this is client side, we can just use the sandbox/prod URL based on NEXT_PUBLIC_... if we had one for mode
        // Or just hardcode for now based on the .env we saw (IS_PRODUCTION=false)

        // Better: use the one from .env (we need to make sure MIDTRANS_IS_PRODUCTION is available to client if we use it here, 
        // OR just use a NEXT_PUBLIC var for the script URL)
        // For now, I'll assume Sandbox because .env said false.
        const scriptUrl = "https://app.sandbox.midtrans.com/snap/snap.js";

        const scriptId = "midtrans-script";
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        if (!script) {
            script = document.createElement("script");
            script.src = scriptUrl;
            script.id = scriptId;
            script.setAttribute("data-client-key", myMidtransClientKey || "");
            script.async = true;
            script.onload = () => setSnapLoaded(true);
            document.body.appendChild(script);
        } else {
            setSnapLoaded(true);
        }

        return () => {
            // interactions with snap usually don't require cleanup of the script tag itself 
            // as it creates a global `snap` object.
        };
    }, []);

    const snapPay = useCallback((token: string, callbacks: {
        onSuccess?: (result: any) => void;
        onPending?: (result: any) => void;
        onError?: (result: any) => void;
        onClose?: () => void;
    }) => {
        if (window.snap && snapLoaded) {
            window.snap.pay(token, {
                onSuccess: (result: any) => {
                    callbacks.onSuccess?.(result);
                },
                onPending: (result: any) => {
                    callbacks.onPending?.(result);
                },
                onError: (result: any) => {
                    callbacks.onError?.(result);
                },
                onClose: () => {
                    callbacks.onClose?.();
                },
            });
        } else {
            console.error("Snap is not loaded yet");
        }
    }, [snapLoaded]);

    return { snapPay, snapLoaded };
};

"use client";

import { useEffect, useState, useCallback } from "react";
import type { SnapResult, SnapWindow } from "@/types/midtrans-client";

declare global {
    interface Window {
        snap?: SnapWindow["snap"];
    }
}

interface SnapCallbacks {
    onSuccess?: (result: SnapResult) => void;
    onPending?: (result: SnapResult) => void;
    onError?: (result: SnapResult) => void;
    onClose?: () => void;
}

export const useSnap = () => {
    const [snapLoaded, setSnapLoaded] = useState(
        () => typeof window !== "undefined" && typeof window.snap?.pay === "function"
    );

    useEffect(() => {
        const myMidtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
        const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
        const scriptUrl = isProduction
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js";

        const scriptId = "midtrans-script";
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        const handleLoad = () => setSnapLoaded(true);

        if (!script) {
            script = document.createElement("script");
            script.src = scriptUrl;
            script.id = scriptId;
            script.setAttribute("data-client-key", myMidtransClientKey || "");
            script.async = true;
            script.onload = handleLoad;
            document.body.appendChild(script);
        } else if (!window.snap) {
            script.addEventListener("load", handleLoad);
        }

        return () => {
            script.onload = null;
            script.removeEventListener("load", handleLoad);
        };
    }, []);

    const snapPay = useCallback((token: string, callbacks: SnapCallbacks) => {
        if (window.snap && snapLoaded) {
            window.snap.pay(token, {
                onSuccess: (result) => {
                    callbacks.onSuccess?.(result);
                },
                onPending: (result) => {
                    callbacks.onPending?.(result);
                },
                onError: (result) => {
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

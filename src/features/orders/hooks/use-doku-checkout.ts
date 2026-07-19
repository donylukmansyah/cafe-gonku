"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    loadJokulCheckout?: (paymentUrl: string) => void;
  }
}

export function useDokuCheckout() {
  const [isLoaded, setIsLoaded] = useState(
    () => typeof window !== "undefined" && typeof window.loadJokulCheckout === "function",
  );

  useEffect(() => {
    const isProduction = process.env.NEXT_PUBLIC_DOKU_ENV === "production";
    const scriptUrl = isProduction
      ? "https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js"
      : "https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js";
    const scriptId = "doku-checkout-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    const handleLoad = () => setIsLoaded(true);

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = scriptUrl;
      script.async = true;
      script.onload = handleLoad;
      document.body.appendChild(script);
    } else if (typeof window.loadJokulCheckout !== "function") {
      script.addEventListener("load", handleLoad);
    }

    return () => {
      if (!script) return;
      script.onload = null;
      script.removeEventListener("load", handleLoad);
    };
  }, []);

  const openDokuCheckout = useCallback(
    (paymentUrl: string, { allowPopup = true }: { allowPopup?: boolean } = {}) => {
      // ponytail: allowPopup=false forces redirect; upgrade to always use SDK
      // if DOKU adds a non-popup embed mode
      if (allowPopup && typeof window.loadJokulCheckout === "function") {
        window.loadJokulCheckout(paymentUrl);
        return true;
      }

      // Redirect fallback — never blocked by popup blockers
      window.location.href = paymentUrl;
      return false;
    },
    [],
  );

  return { isLoaded, openDokuCheckout };
}

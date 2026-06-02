"use client";

import { useEffect, useRef } from "react";

type UseLiveRefetchOptions = {
  enabled?: boolean;
  intervalMs?: number;
  onRefetch: () => void;
};

export function useLiveRefetch({
  enabled = true,
  intervalMs,
  onRefetch,
}: UseLiveRefetchOptions) {
  const onRefetchRef = useRef(onRefetch);

  useEffect(() => {
    onRefetchRef.current = onRefetch;
  }, [onRefetch]);

  useEffect(() => {
    if (!enabled) return;

    const refetch = () => onRefetchRef.current();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    };

    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = intervalMs
      ? window.setInterval(() => {
          if (document.visibilityState === "visible") {
            refetch();
          }
        }, intervalMs)
      : null;

    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [enabled, intervalMs]);
}

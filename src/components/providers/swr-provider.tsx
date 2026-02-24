"use client";

import { SWRConfig } from "swr";
import { apiFetch } from "@/lib/api-fetch";

export function SWRProvider({ children }: { children: React.ReactNode }) {
    return (
        <SWRConfig
            value={{
                fetcher: apiFetch,
                revalidateOnFocus: false, // Prevent aggressive refetching on window focus
                errorRetryCount: 3, // Retry failed fetches up to 3 times
                shouldRetryOnError: true,
                focusThrottleInterval: 5000,
            }}
        >
            {children}
        </SWRConfig>
    );
}

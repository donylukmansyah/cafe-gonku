import { toast } from "sonner";

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    details?: unknown;
}

export interface ApiOptions extends RequestInit {
    silent?: boolean;
}

export async function apiFetch<T>(
    url: string,
    options?: ApiOptions
): Promise<T> {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options?.headers,
            },
        });

        const result: ApiResponse<T> = await response.json();

        if (!response.ok || !result.success) {
            const errorMessage = result.error || "Terjadi kesalahan pada server";
            // console.error(`[API Error] ${url}:`, result);

            // Only show toast for non-silent requests (default is to show)
            if (!options?.silent) {
                toast.error(errorMessage);
            }

            throw new Error(errorMessage);
        }

        return result.data;
    } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
            // Optional: Handle redirect to login or show auth modal
        }
        throw error;
    }
}

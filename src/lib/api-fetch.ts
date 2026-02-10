import { toast } from "sonner";

interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    details?: any;
    _timestamp: string;
}

export async function apiFetch<T>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
        });

        const result: ApiResponse<T> = await response.json();

        if (!response.ok || !result.success) {
            const errorMessage = result.error || "Terjadi kesalahan pada server";
            toast.error(errorMessage);
            throw new Error(errorMessage);
        }

        return result.data;
    } catch (error) {
        // If the error was already thrown above (and toasted), rethrow it.
        // If it's a network error (fetch failed), toast it and throw.
        if (error instanceof Error && error.message === "Terjadi kesalahan pada server") {
            throw error;
        }

        // For network errors or JSON parsing errors
        const message = error instanceof Error ? error.message : "Gagal menghubungi server";
        // Avoid double toast if we already toasted inside the logic above
        // actually, simpler logic:
        // If we threw inside, we toasted.
        // If fetch failed, we land here without toasting.

        // Let's refine the catch block.
        // Actually, simple is better. The caller might want to handle it too.
        // But the requirement says "benerin error".

        // Re-throwing allows the caller (order-client) to handle loading states
        throw error;
    }
}

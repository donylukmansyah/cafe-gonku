import * as Sentry from "@sentry/nextjs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

export async function deleteMenuImage(imageUrl: string) {
    try {
        if (!imageUrl.startsWith(supabaseUrl)) {
            console.warn("Attempted to delete image from external or untrusted URL:", imageUrl);
            return;
        }

        const parts = imageUrl.split("/menu-images/");
        if (parts.length < 2) return;

        if (!supabaseAdmin) {
            console.error("Supabase Admin client not initialized (check environment variables)");
            return;
        }

        const { error } = await supabaseAdmin.storage
            .from("menu-images")
            .remove([parts[1]]);

        if (error) {
            console.error("Error deleting image from Supabase:", error);
            throw error;
        }
    } catch (error) {
        console.error("Failed to delete image:", error);
    }
}

export async function sendBroadcast(
    event: string,
    payload: Record<string, unknown>,
    channelName: string = "kitchen-updates",
) {
    try {
        const endpoint = `${supabaseUrl}/realtime/v1/api/broadcast`;
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                apikey: supabaseServiceRoleKey,
                Authorization: `Bearer ${supabaseServiceRoleKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [{ topic: channelName, event, payload }],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`[Supabase REST] Broadcast failed: ${response.status} - ${errorText}`);
            Sentry.captureException(error, {
                tags: { channelName, event, integration: "supabase-realtime" },
            });
            console.error(error.message);

            return { ok: false, status: response.status, error: error.message };
        }

        return { ok: true, status: response.status };
    } catch (error) {
        Sentry.captureException(error, {
            tags: { channelName, event, integration: "supabase-realtime" },
        });
        console.error("[Supabase REST] Broadcast error:", error);

        return {
            ok: false,
            error: error instanceof Error ? error.message : "Unknown broadcast error",
        };
    }
}

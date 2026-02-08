import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for public/anon operations (client-side safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (bypasses RLS)
// We only initialize this if the key is present (server-side only)
export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

// Helper function untuk upload image (bisa dipakai di client/server, tapi server route pakai admin client sendiri)
// Kita pertahankan ini untuk referensi, tapi route upload pakai logic sendiri.
// Tapi untuk konsistensi, bisa kita update nnti.

// Helper function untuk delete image (Server-side only recommended)
export async function deleteMenuImage(imageUrl: string) {
    try {
        // extract and verify URL
        if (!imageUrl.startsWith(supabaseUrl)) {
            console.warn("Attempted to delete image from external or untrusted URL:", imageUrl)
            return
        }

        const parts = imageUrl.split('/menu-images/')
        if (parts.length < 2) return // Invalid URL or not from our bucket

        const filePath = parts[1]

        if (!supabaseAdmin) {
            console.error("Supabase Admin client not initialized (check environment variables)")
            return
        }

        const { error } = await supabaseAdmin.storage
            .from('menu-images')
            .remove([filePath])

        if (error) {
            console.error("Error deleting image from Supabase:", error)
            throw error
        }
    } catch (error) {
        console.error("Failed to delete image:", error)
        // Don't block flow if image delete fails, just log it
    }
}

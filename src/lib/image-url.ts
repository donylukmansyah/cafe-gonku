const currentSupabaseHost = (() => {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return rawUrl ? new URL(rawUrl).host : null;
  } catch {
    return null;
  }
})();

export function normalizeImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;

  try {
    const parsedUrl = new URL(imageUrl);
    const isSupabaseAsset = parsedUrl.host.endsWith(".supabase.co");

    if (isSupabaseAsset && currentSupabaseHost && parsedUrl.host !== currentSupabaseHost) {
      return null;
    }
  } catch {
    return imageUrl;
  }

  return imageUrl;
}

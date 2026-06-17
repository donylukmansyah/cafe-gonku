import { cacheGet, cacheSet } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";

const PATRINS_API_BASE = "https://patrins.com";
const PATRINS_DOWNLOAD_TOKEN_TTL_SECONDS = 60 * 60 * 11;
const MENU_IMAGE_BUCKET = "menu-images";

type UploadMenuImageInput = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

type UploadMenuImageResult = {
  provider: "patrins" | "supabase";
  url: string;
  path: string;
};

function getPatrinsAuthHeaders() {
  const apiKey = process.env.PATRINS_API_KEY;
  if (!apiKey) return null;

  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

function getPatrinsFileId(imageUrl: string) {
  const match = imageUrl.match(/\/api\/images\/patrins\/([^/?#]+)/);
  if (match?.[1]) return match[1];

  const patrinsPageMatch = imageUrl.match(/patrins\.com\/f\/([^/?#]+)/);
  if (patrinsPageMatch?.[1]) return patrinsPageMatch[1];

  return null;
}

async function ensureMenuImageBucket() {
  if (!supabaseAdmin) {
    throw new Error("Supabase Admin client not initialized");
  }

  const { data: bucket, error: getError } = await supabaseAdmin.storage.getBucket(MENU_IMAGE_BUCKET);
  if (bucket && !getError) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(MENU_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw createError;
  }
}

async function uploadToSupabase({
  fileName,
  mimeType,
  bytes,
}: UploadMenuImageInput): Promise<UploadMenuImageResult> {
  if (!supabaseAdmin) {
    throw new Error("Supabase Admin client not initialized");
  }

  await ensureMenuImageBucket();

  const filePath = `menus/${fileName}`;
  const { error } = await supabaseAdmin.storage
    .from(MENU_IMAGE_BUCKET)
    .upload(filePath, bytes, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(MENU_IMAGE_BUCKET)
    .getPublicUrl(filePath);

  return {
    provider: "supabase",
    url: urlData.publicUrl,
    path: filePath,
  };
}

export async function uploadMenuImage(input: UploadMenuImageInput) {
  return uploadToSupabase(input);
}

export async function getPatrinsDownloadUrl(fileId: string) {
  const cacheKey = `patrins:download-url:${fileId}`;
  const cachedUrl = await cacheGet<string>(cacheKey);
  if (cachedUrl) return cachedUrl;

  const response = await fetch(`${PATRINS_API_BASE}/api/download/${fileId}/token`, {
    method: "POST",
  });
  const payload = await response.json();

  if (!response.ok || !payload?.downloadUrl) {
    throw new Error(payload?.error || "Failed to create Patrins download URL");
  }

  await cacheSet(
    cacheKey,
    payload.downloadUrl,
    PATRINS_DOWNLOAD_TOKEN_TTL_SECONDS,
  );

  return payload.downloadUrl as string;
}

export async function deleteMenuImage(imageUrl: string) {
  const patrinsFileId = getPatrinsFileId(imageUrl);
  if (patrinsFileId) {
    const authHeaders = getPatrinsAuthHeaders();
    if (!authHeaders) return;

    try {
      await fetch(`${PATRINS_API_BASE}/api/files/${patrinsFileId}/trash`, {
        method: "POST",
        headers: authHeaders,
      });
    } catch (error) {
      console.error("[ImageStorage] Patrins delete failed", error);
    }
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !imageUrl.startsWith(supabaseUrl)) {
    return;
  }

  const parts = imageUrl.split(`/${MENU_IMAGE_BUCKET}/`);
  if (parts.length < 2 || !supabaseAdmin) return;

  const { error } = await supabaseAdmin.storage
    .from(MENU_IMAGE_BUCKET)
    .remove([parts[1]]);

  if (error) {
    console.error("[ImageStorage] Supabase delete failed", error);
  }
}

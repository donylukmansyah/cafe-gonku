import { cacheGet, cacheSet } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";

const PATRINS_API_BASE = "https://patrins.com";
const PATRINS_DOWNLOAD_TOKEN_TTL_SECONDS = 60 * 60 * 11;

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

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function resolvePatrinsUrl(pathOrUrl: string) {
  return pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${PATRINS_API_BASE}${pathOrUrl}`;
}

function getPatrinsFileUrl(fileId: string) {
  return `${getAppUrl()}/api/images/patrins/${fileId}`;
}

function getPatrinsFileId(imageUrl: string) {
  const match = imageUrl.match(/\/api\/images\/patrins\/([^/?#]+)/);
  if (match?.[1]) return match[1];

  const patrinsPageMatch = imageUrl.match(/patrins\.com\/f\/([^/?#]+)/);
  if (patrinsPageMatch?.[1]) return patrinsPageMatch[1];

  return null;
}

async function uploadToPatrins({
  fileName,
  mimeType,
  bytes,
}: UploadMenuImageInput): Promise<UploadMenuImageResult> {
  const authHeaders = getPatrinsAuthHeaders();
  if (!authHeaders) {
    throw new Error("PATRINS_API_KEY is not configured");
  }

  const initResponse = await fetch(`${PATRINS_API_BASE}/api/upload-direct/init`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName,
      fileSize: bytes.byteLength,
      mimeType,
      ...(process.env.PATRINS_FOLDER_ID
        ? { folderId: process.env.PATRINS_FOLDER_ID }
        : {}),
    }),
  });

  const initPayload = await initResponse.json();
  if (!initResponse.ok) {
    throw new Error(initPayload?.error || "Patrins upload init failed");
  }

  const uploadResponse = await fetch(resolvePatrinsUrl(initPayload.uploadUrl), {
    method: "PUT",
    headers: {
      ...authHeaders,
      "Content-Type": "application/octet-stream",
    },
    body: Buffer.from(bytes),
  });

  if (!uploadResponse.ok) {
    throw new Error(await uploadResponse.text());
  }

  const finalizeResponse = await fetch(`${PATRINS_API_BASE}/api/upload-finalize`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uploadId: initPayload.uploadId }),
  });

  const finalizePayload = await finalizeResponse.json();
  if (!finalizeResponse.ok || !finalizePayload?.file?.id) {
    throw new Error(finalizePayload?.error || "Patrins upload finalize failed");
  }

  const fileId = finalizePayload.file.id as string;
  return {
    provider: "patrins",
    url: getPatrinsFileUrl(fileId),
    path: `patrins:${fileId}`,
  };
}

async function uploadToSupabase({
  fileName,
  mimeType,
  bytes,
}: UploadMenuImageInput): Promise<UploadMenuImageResult> {
  if (!supabaseAdmin) {
    throw new Error("Supabase Admin client not initialized");
  }

  const filePath = `menus/${fileName}`;
  const { error } = await supabaseAdmin.storage
    .from("menu-images")
    .upload(filePath, bytes, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data: urlData } = supabaseAdmin.storage
    .from("menu-images")
    .getPublicUrl(filePath);

  return {
    provider: "supabase",
    url: urlData.publicUrl,
    path: filePath,
  };
}

export async function uploadMenuImage(input: UploadMenuImageInput) {
  try {
    return await uploadToPatrins(input);
  } catch (error) {
    console.error("[ImageStorage] Patrins upload failed, falling back to Supabase", error);
    return uploadToSupabase(input);
  }
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

  const parts = imageUrl.split("/menu-images/");
  if (parts.length < 2 || !supabaseAdmin) return;

  const { error } = await supabaseAdmin.storage
    .from("menu-images")
    .remove([parts[1]]);

  if (error) {
    console.error("[ImageStorage] Supabase delete failed", error);
  }
}

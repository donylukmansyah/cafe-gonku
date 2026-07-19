import { supabaseAdmin } from "@/server/realtime/supabase";

const MENU_IMAGE_BUCKET = "menu-images";

type UploadMenuImageInput = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

type UploadMenuImageResult = {
  url: string;
  path: string;
};

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
    url: urlData.publicUrl,
    path: filePath,
  };
}

export async function uploadMenuImage(input: UploadMenuImageInput) {
  return uploadToSupabase(input);
}

export async function deleteMenuImage(imageUrl: string) {
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

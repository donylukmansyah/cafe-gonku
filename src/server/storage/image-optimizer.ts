import sharp from "sharp";

export async function optimizeImage(
  buffer: Uint8Array,
  mimeType: string,
): Promise<{ data: Uint8Array; mimeType: string }> {
  try {
    const optimized = await sharp(buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    return {
      data: new Uint8Array(optimized),
      mimeType: "image/webp",
    };
  } catch (error) {
    console.error("[ImageOptimizer] sharp failed, returning original", error);
    return { data: buffer, mimeType };
  }
}

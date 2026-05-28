import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPatrinsDownloadUrl } from "@/lib/image-storage";

export async function GET(
  request: NextRequest,
  props: { params: Promise<unknown> },
) {
  try {
    const { id } = (await props.params) as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "Image ID required" }, { status: 400 });
    }

    const downloadUrl = await getPatrinsDownloadUrl(id);
    return NextResponse.redirect(downloadUrl, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[Patrins Image] Failed to resolve image", error);
    return NextResponse.json({ error: "Image unavailable" }, { status: 502 });
  }
}

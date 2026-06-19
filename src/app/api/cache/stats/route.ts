import { connection } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { apiError, apiResponse, handleApiError } from "@/lib/api-utils";
import { getCacheStats } from "@/lib/redis";

export async function GET() {
  await connection();

  try {
    const session = await getServerSession();
    if (!session) return apiError("Unauthorized", 401);

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "OWNER") return apiError("Forbidden", 403);

    const stats = await getCacheStats([
      "menus",
      "tables",
      "analytics",
      "download-url",
    ]);

    return apiResponse({ stats });
  } catch (error) {
    return handleApiError(error, "GET /api/cache/stats");
  }
}

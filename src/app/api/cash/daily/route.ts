import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "@/lib/server-auth";
import { apiError, apiResponse, handleApiError } from "@/lib/api-utils";
import { OWNER_DASHBOARD_CACHE_TAG } from "@/lib/cache-tags";
import { DailyCashService } from "@/features/revenue/daily-cash.service";
import { dailyCashEntrySchema } from "@/validations/cash";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return apiError("Unauthorized", 401);
    }

    const userRole = (session.user as { role?: string }).role;

    if (userRole !== "KITCHEN" && userRole !== "OWNER") {
      return apiError("Forbidden", 403);
    }

    const date = request.nextUrl.searchParams.get("date") ?? undefined;
    const [entry, recentEntries] = await Promise.all([
      DailyCashService.getDailyEntry(date),
      DailyCashService.getRecentEntries(),
    ]);

    return apiResponse({
      entry,
      recentEntries,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/cash/daily");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return apiError("Unauthorized", 401);
    }

    const userRole = (session.user as { role?: string }).role;

    if (userRole !== "KITCHEN" && userRole !== "OWNER") {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const payload = dailyCashEntrySchema.parse(body);

    const entry = await DailyCashService.upsertDailyEntry({
      ...payload,
      recordedBy: session.user.name ?? session.user.email ?? null,
    });

    revalidateTag(OWNER_DASHBOARD_CACHE_TAG, "max");

    return apiResponse({
      entry,
      message: "Daily cash report updated",
    });
  } catch (error) {
    return handleApiError(error, "PUT /api/cash/daily");
  }
}

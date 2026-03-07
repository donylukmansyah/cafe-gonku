import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { AnalyticsService } from "@/lib/services/analytics.service";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401);

        const user = session.user as { role?: string };
        if (user.role !== "ADMIN") return apiError("Forbidden", 403);

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get("days") || "7");

        const dashboardMetrics = await AnalyticsService.getDashboardMetrics(days);

        return apiResponse(dashboardMetrics);

    } catch (error) {
        return handleApiError(error, "GET /api/analytics");
    }
}

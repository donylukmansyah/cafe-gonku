import { connection, NextRequest } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { createApiTimer } from "@/lib/api-timing";

export async function GET(request: NextRequest) {
    await connection();
    const timer = createApiTimer("GET /api/analytics");

    try {
        const session = await timer.step("auth", () => getServerSession());
        if (!session) {
            timer.finish(401);
            return apiError("Unauthorized", 401);
        }

        const user = session.user as { role?: string };
        if (user.role !== "OWNER") {
            timer.finish(403);
            return apiError("Forbidden", 403);
        }

        const { searchParams } = new URL(request.url);
        const daysParam = searchParams.get("days");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        
        let dashboardMetrics;
        
        if (startDate && endDate) {
            dashboardMetrics = await timer.step("analytics", () =>
                AnalyticsService.getDashboardMetrics({
                    startDate,
                    endDate
                }),
            );
        } else {
            const days = parseInt(daysParam || "7");
            dashboardMetrics = await timer.step("analytics", () =>
                AnalyticsService.getDashboardMetrics({ days }),
            );
        }

        timer.finish(200, { range: startDate && endDate ? "custom" : "days" });
        return apiResponse(dashboardMetrics);

    } catch (error) {
        timer.finish(500);
        return handleApiError(error, "GET /api/analytics");
    }
}

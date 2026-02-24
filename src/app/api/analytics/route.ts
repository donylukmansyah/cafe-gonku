import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, format } from "date-fns";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401);

        const user = session.user as { role?: string };
        if (user.role !== "ADMIN") return apiError("Forbidden", 403);

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get("days") || "7");

        const endDate = new Date();
        const startDate = startOfDay(subDays(endDate, days - 1));

        // 1. Get raw orders (grouped by date client side since Prisma groupBy on absolute timestamps is awkward across timezone diffs)
        // Optimized: Only select what's needed for the revenue chart
        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                paymentStatus: "PAID",
            },
            select: {
                createdAt: true,
                totalAmount: true,
            },
        });

        // 2. Fetch top menus directly using the optimized approach, relying heavily on DB
        const topOrderItems = await prisma.orderItem.groupBy({
            by: ['menuId'],
            where: {
                order: {
                    createdAt: { gte: startDate, lte: endDate },
                    paymentStatus: "PAID"
                }
            },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });

        const menuDetails = await prisma.menu.findMany({
            where: { id: { in: topOrderItems.map(item => item.menuId) } },
            select: { id: true, name: true, category: true }
        });

        const topMenusWithDetails = topOrderItems.map(item => {
            const detail = menuDetails.find(m => m.id === item.menuId);
            return {
                name: detail?.name || "Unknown",
                category: detail?.category || "Unknown",
                quantity: item._sum.quantity || 0
            }
        });

        // Initialize maps
        const salesByDate = new Map<string, { date: string; revenue: number; orders: number }>();
        for (let i = 0; i < days; i++) {
            const dateStr = format(subDays(endDate, i), "dd MMM");
            salesByDate.set(dateStr, { date: dateStr, revenue: 0, orders: 0 });
        }

        let totalRevenue = 0;
        let totalOrders = 0;

        orders.forEach(order => {
            const dateStr = format(order.createdAt, "dd MMM");
            const current = salesByDate.get(dateStr) || { date: dateStr, revenue: 0, orders: 0 };

            salesByDate.set(dateStr, {
                date: dateStr,
                revenue: current.revenue + order.totalAmount,
                orders: current.orders + 1
            });

            totalRevenue += order.totalAmount;
            totalOrders++;
        });

        const dates = Array.from(salesByDate.keys()).reverse();
        const chartData = dates.map(date => salesByDate.get(date));

        return apiResponse({
            chartData,
            topMenus: topMenusWithDetails,
            totalRevenue,
            totalOrders,
        });

    } catch (error) {
        return handleApiError(error, "GET /api/analytics");
    }
}

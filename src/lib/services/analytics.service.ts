import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, format } from "date-fns";
import { Prisma } from "@prisma/client";

export class AnalyticsService {
    /**
     * Get dashboard analytics for a given number of days.
     * Includes revenue chart data, top menus, total revenue, and total orders.
     */
    static async getDashboardMetrics(days: number = 7) {
        const endDate = new Date();
        const startDate = startOfDay(subDays(endDate, days - 1));

        // 1 & 2. Get raw orders and top order items in parallel to eliminate waterfalls
        const [orders, topOrderItems] = await Promise.all([
            prisma.order.findMany({
                where: {
                    createdAt: { gte: startDate, lte: endDate },
                    paymentStatus: "PAID",
                },
                select: {
                    createdAt: true,
                    totalAmount: true,
                },
            }),
            prisma.orderItem.groupBy({
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
            })
        ]);

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

        // Initialize maps for timeline chart
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

        return {
            chartData,
            topMenus: topMenusWithDetails,
            totalRevenue,
            totalOrders,
        };
    }
}

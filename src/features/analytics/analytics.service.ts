import { prisma } from "@/lib/prisma";
import {
  getCafeDateKey,
  getCafeDateLabel,
  getCafeDateTimeRange,
  getCafeDayRange,
  parseDateOnly,
} from "@/lib/cafe-date";

type DashboardChartPoint = {
  date: string;
  onlineRevenue: number;
  cashRevenue: number;
  totalRevenue: number;
  orders: number;
};

export class AnalyticsService {
  static async getDashboardMetrics(days = 7) {
    const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 30) : 7;
    const { dateKeys, start, end } = getCafeDateTimeRange(safeDays);
    const dateOnlyStart = parseDateOnly(dateKeys[0]);
    const dateOnlyEnd = parseDateOnly(dateKeys[dateKeys.length - 1]);

    const [paidOrders, topOrderItems, cashRecords] = await Promise.all([
      prisma.order.findMany({
        where: {
          paymentStatus: "PAID",
          paidAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          paidAt: true,
          totalAmount: true,
        },
      }),
      prisma.orderItem.groupBy({
        by: ["menuId"],
        where: {
          order: {
            paymentStatus: "PAID",
            paidAt: {
              gte: start,
              lte: end,
            },
          },
        },
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 5,
      }),
      prisma.dailyCashRecord.findMany({
        where: {
          date: {
            gte: dateOnlyStart,
            lte: dateOnlyEnd,
          },
        },
        select: {
          date: true,
          amount: true,
        },
      }),
    ]);

    const menuDetails = topOrderItems.length
      ? await prisma.menu.findMany({
          where: {
            id: {
              in: topOrderItems.map((item) => item.menuId),
            },
          },
          select: {
            id: true,
            name: true,
            category: true,
          },
        })
      : [];

    const chartMap = new Map<string, DashboardChartPoint>(
      dateKeys.map((dateKey) => [
        dateKey,
        {
          date: getCafeDateLabel(dateKey),
          onlineRevenue: 0,
          cashRevenue: 0,
          totalRevenue: 0,
          orders: 0,
        },
      ]),
    );

    let onlineRevenue = 0;
    let totalOrders = 0;

    for (const order of paidOrders) {
      if (!order.paidAt) {
        continue;
      }

      const dateKey = getCafeDateKey(order.paidAt);
      const current = chartMap.get(dateKey);

      if (!current) {
        continue;
      }

      current.onlineRevenue += order.totalAmount;
      current.totalRevenue += order.totalAmount;
      current.orders += 1;

      onlineRevenue += order.totalAmount;
      totalOrders += 1;
    }

    let cashRevenue = 0;

    for (const record of cashRecords) {
      const dateKey = getCafeDateKey(record.date);
      const current = chartMap.get(dateKey);

      if (!current) {
        continue;
      }

      current.cashRevenue += record.amount;
      current.totalRevenue += record.amount;
      cashRevenue += record.amount;
    }

    const chartData = dateKeys.map((dateKey) => chartMap.get(dateKey)!);

    const topMenus = topOrderItems.map((item) => {
      const detail = menuDetails.find((menu) => menu.id === item.menuId);

      return {
        name: detail?.name ?? "Unknown",
        category: detail?.category ?? "Unknown",
        quantity: item._sum.quantity ?? 0,
      };
    });

    return {
      chartData,
      topMenus,
      totalRevenue: onlineRevenue + cashRevenue,
      netIncome: onlineRevenue + cashRevenue,
      onlineRevenue,
      cashRevenue,
      totalOrders,
    };
  }

  static async getAdminOverview() {
    const { start, end } = getCafeDayRange();

    const [menuCount, tableCount, todayOrders, todayOnlineRevenue, todayCashRecord] =
      await Promise.all([
        prisma.menu.count({
          where: {
            isActive: true,
          },
        }),
        prisma.table.count({
          where: {
            isActive: true,
          },
        }),
        prisma.order.count({
          where: {
            paymentStatus: "PAID",
            paidAt: {
              gte: start,
              lte: end,
            },
          },
        }),
        prisma.order.aggregate({
          _sum: {
            totalAmount: true,
          },
          where: {
            paymentStatus: "PAID",
            paidAt: {
              gte: start,
              lte: end,
            },
          },
        }),
        prisma.dailyCashRecord.findUnique({
          where: {
            date: parseDateOnly(getCafeDateKey()),
          },
          select: {
            amount: true,
          },
        }),
      ]);

    const onlineRevenue = todayOnlineRevenue._sum.totalAmount ?? 0;
    const cashRevenue = todayCashRecord?.amount ?? 0;

    return {
      menuCount,
      tableCount,
      todayOrders,
      onlineRevenue,
      cashRevenue,
      totalRevenue: onlineRevenue + cashRevenue,
    };
  }
}

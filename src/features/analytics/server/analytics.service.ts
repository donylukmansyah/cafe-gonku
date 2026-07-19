import { prisma } from "@/server/db/prisma";
import { cacheRemember } from "@/server/cache/redis";
import { AppError } from "@/server/http/api-utils";
import {
  getCafeDateKey,
  getCafeDateLabel,
  getCafeDateTimeRange,
  getCafeDateTimeRangeFromDates,
  getCafeDayRange,
  parseDateOnly,
} from "@/shared/cafe-date";

type DashboardChartPoint = {
  date: string;
  onlineRevenue: number;
  cashRevenue: number;
  totalRevenue: number;
  orders: number;
};

type MetricsOptions = {
  days?: number;
  startDate?: string;
  endDate?: string;
};

type DashboardMetrics = {
  chartData: DashboardChartPoint[];
  topMenus: {
    name: string;
    category: string;
    quantity: number;
  }[];
  allMenuSales: {
    name: string;
    category: string;
    quantity: number;
  }[];
  totalRevenue: number;
  netIncome: number;
  onlineRevenue: number;
  cashRevenue: number;
  totalOrders: number;
};

const MAX_ANALYTICS_DAYS = 90;

type OwnerOverview = {
  menuCount: number;
  tableCount: number;
  todayOrders: number;
  onlineRevenue: number;
  cashRevenue: number;
  totalRevenue: number;
};

export class AnalyticsService {
  static async getDashboardMetrics(options: MetricsOptions = { days: 7 }) {
    return cacheRemember<DashboardMetrics>({
      scope: "analytics",
      key: `metrics:${options.startDate ?? ""}:${options.endDate ?? ""}:${options.days ?? 7}`,
      ttlSeconds: 60,
      load: async () => {
    let dateKeys: string[];
    let start: Date;
    let end: Date;

    if (options.startDate && options.endDate) {
      const range = getCafeDateTimeRangeFromDates(options.startDate, options.endDate);
      if (range.dateKeys.length > MAX_ANALYTICS_DAYS) {
        throw new AppError(`Rentang analytics maksimal ${MAX_ANALYTICS_DAYS} hari.`, 400);
      }
      dateKeys = range.dateKeys;
      start = range.start;
      end = range.end;
    } else {
      const days = options.days || 7;
      const safeDays = Number.isFinite(days)
        ? Math.min(Math.max(days, 1), MAX_ANALYTICS_DAYS)
        : 7;
      const range = getCafeDateTimeRange(safeDays);
      dateKeys = range.dateKeys;
      start = range.start;
      end = range.end;
    }

    const dateOnlyStart = parseDateOnly(dateKeys[0]);
    const dateOnlyEnd = parseDateOnly(dateKeys[dateKeys.length - 1]);

    const [paidOrders, allOrderItems, cashRecords] = await Promise.all([
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

    const menuDetails = allOrderItems.length
      ? await prisma.menu.findMany({
          where: {
            id: {
              in: allOrderItems.map((item) => item.menuId),
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

    const allMenuSales = allOrderItems.map((item) => {
      const detail = menuDetails.find((menu) => menu.id === item.menuId);

      return {
        name: detail?.name ?? "Unknown",
        category: detail?.category ?? "Unknown",
        quantity: item._sum.quantity ?? 0,
      };
    });

    const topMenus = allMenuSales.slice(0, 5);

    const result: DashboardMetrics = {
      chartData,
      topMenus,
      allMenuSales,
      totalRevenue: onlineRevenue + cashRevenue,
      netIncome: onlineRevenue + cashRevenue,
      onlineRevenue,
      cashRevenue,
      totalOrders,
    };

    return result;
      },
    });
  }

  static async getOwnerOverview() {
    return cacheRemember<OwnerOverview>({
      scope: "analytics",
      key: "owner-overview",
      ttlSeconds: 60,
      load: async () => {
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

    const result: OwnerOverview = {
      menuCount,
      tableCount,
      todayOrders,
      onlineRevenue,
      cashRevenue,
      totalRevenue: onlineRevenue + cashRevenue,
    };

    return result;
      },
    });
  }
}

import { prisma } from "@/lib/prisma";
import { bumpCacheVersion, cacheRemember } from "@/lib/redis";
import { UpdateTableValues } from "@/validations/table";

type TableListItem = Awaited<ReturnType<typeof prisma.table.findMany>>[number];
type TableLookupItem = {
    id: string;
    tableNumber: number;
    qrCode: string;
};

export class TableService {
    static async getTables() {
        return cacheRemember<TableListItem[]>({
            scope: "tables",
            key: "list",
            ttlSeconds: 300,
            load: () =>
                prisma.table.findMany({
                    orderBy: { tableNumber: "asc" },
                }),
        });
    }

    static async getTableById(id: string) {
        return await prisma.table.findUnique({ where: { id } });
    }

    static async getTableByQrCode(qrCode: string) {
        return cacheRemember<TableLookupItem | null>({
            scope: "tables",
            key: `qr:${qrCode}`,
            ttlSeconds: 600,
            load: () =>
                prisma.table.findFirst({
                    where: { qrCode, isActive: true },
                    select: { id: true, tableNumber: true, qrCode: true }
                }),
        });
    }

    static async createTable(data: { tableNumber: number, capacity: number }) {
        const { tableNumber, capacity } = data;

        const existing = await prisma.table.findUnique({
            where: { tableNumber },
        });

        if (existing) {
            throw new Error(`Meja nomor ${tableNumber} sudah ada`);
        }

        const qrCode = `GONKU_TABLE_${tableNumber}_${Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase()}`;

        const table = await prisma.table.create({
            data: {
                tableNumber,
                capacity,
                qrCode,
            },
        });

        await bumpCacheVersion("tables");
        await bumpCacheVersion("analytics");

        return table;
    }

    static async updateTable(id: string, data: UpdateTableValues) {
        const table = await prisma.table.update({
            where: { id },
            data,
        });

        await bumpCacheVersion("tables");
        await bumpCacheVersion("analytics");

        return table;
    }

    static async deleteTable(id: string) {
        const table = await prisma.table.findUnique({
            where: { id },
            select: { id: true }
        });

        if (!table) {
            throw new Error("Table not found");
        }

        await prisma.table.update({
            where: { id },
            data: { isActive: false },
        });
        await bumpCacheVersion("tables");
        await bumpCacheVersion("analytics");

        return true;

    }
}

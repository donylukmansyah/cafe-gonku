import { prisma } from "@/lib/prisma";
import { UpdateTableValues } from "@/validations/table";

export class TableService {
    static async getTables() {
        return await prisma.table.findMany({
            orderBy: { tableNumber: "asc" },
        });
    }

    static async getTableById(id: string) {
        return await prisma.table.findUnique({ where: { id } });
    }

    static async getTableByQrCode(qrCode: string) {
        return await prisma.table.findFirst({
            where: { qrCode, isActive: true },
            select: { id: true, tableNumber: true, qrCode: true }
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

        return await prisma.table.create({
            data: {
                tableNumber,
                capacity,
                qrCode,
            },
        });
    }

    static async updateTable(id: string, data: UpdateTableValues) {
        return await prisma.table.update({
            where: { id },
            data,
        });
    }

    static async deleteTable(id: string) {
        const table = await prisma.table.findUnique({
            where: { id },
            select: { id: true }
        });

        if (!table) {
            throw new Error("Table not found");
        }

        await prisma.order.deleteMany({ where: { tableId: id } });
        await prisma.table.delete({ where: { id } });

        return true;
    }
}

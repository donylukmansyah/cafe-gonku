import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";

const createTableSchema = z.object({
    tableNumber: z.coerce.number().min(1, "Nomor meja harus positif"),
    capacity: z.coerce.number().min(1).default(4),
});

// GET /api/tables - List all tables
export async function GET() {
    try {
        const tables = await prisma.table.findMany({
            orderBy: { tableNumber: "asc" },
            include: {
                _count: {
                    select: {
                        orders: {
                            where: {
                                status: { in: ["PENDING", "PAID", "PREPARING"] },
                            },
                        },
                    },
                },
            },
        });

        return apiResponse(tables);
    } catch (error) {
        return handleApiError(error, "GET /api/tables");
    }
}

// POST /api/tables - Create table
export async function POST(request: NextRequest) {
    try {
        // Check auth
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return apiError("Unauthorized", 401);
        }

        const user = session.user as { role?: string };
        if (user.role !== "ADMIN") {
            return apiError("Forbidden: Admin access required", 403);
        }

        // Validate body
        const body = await request.json();
        const validatedData = createTableSchema.parse(body);

        const { tableNumber, capacity } = validatedData;

        // Check if table number already exists
        const existing = await prisma.table.findUnique({
            where: { tableNumber },
        });

        if (existing) {
            return apiError(`Meja nomor ${tableNumber} sudah ada`, 400);
        }

        // Generate unique QR code
        const qrCode = `GONKU_TABLE_${tableNumber}_${Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase()}`;

        // Create table
        const table = await prisma.table.create({
            data: {
                tableNumber,
                capacity,
                qrCode,
            },
        });

        return apiResponse(table, 201);
    } catch (error) {
        return handleApiError(error, "POST /api/tables");
    }
}

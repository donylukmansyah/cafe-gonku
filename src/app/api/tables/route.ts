import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { z } from "zod"
import { handleApiError } from "@/lib/api-utils"

const createTableSchema = z.object({
    tableNumber: z.coerce.number().min(1, "Nomor meja harus positif"),
    capacity: z.coerce.number().min(1).default(4),
})

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
        })

        return NextResponse.json(tables)
    } catch (error) {
        return handleApiError(error)
    }
}

// POST /api/tables - Create table
export async function POST(request: NextRequest) {
    try {
        // Check auth
        const session = await auth.api.getSession({
            headers: await headers(),
        })

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = session.user as { role?: string }
        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
        }

        // Validate body
        const body = await request.json()
        const validatedData = createTableSchema.parse(body)

        const { tableNumber, capacity } = validatedData

        // Check if table number already exists
        const existing = await prisma.table.findUnique({
            where: { tableNumber },
        })

        if (existing) {
            return NextResponse.json(
                { error: `Meja nomor ${tableNumber} sudah ada` },
                { status: 400 }
            )
        }

        // Generate unique QR code
        const qrCode = `GONKU_TABLE_${tableNumber}_${Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase()}`

        // Create table
        const table = await prisma.table.create({
            data: {
                tableNumber,
                capacity,
                qrCode,
            },
        })

        return NextResponse.json(table, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
}

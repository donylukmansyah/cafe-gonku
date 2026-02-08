import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma, OrderStatus } from "@prisma/client";

// GET /api/orders - Get orders for Kitchen Display (Priority Queue)
export async function GET(request: Request) {
    try {
        // Authenticate user
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "KITCHEN" && userRole !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get("status");
        const includeServed = searchParams.get("includeServed") === "true";

        // Build where clause for Priority Queue (Default: Only Today's orders)
        // Indonesia/Jakarta Timezone (GMT+7)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const whereClause: Prisma.OrderWhereInput = {
            paymentStatus: "PAID",
            createdAt: { gte: startOfDay }, // Only today
        };

        if (statusFilter) {
            whereClause.status = { in: statusFilter.split(",") as OrderStatus[] };
        } else if (!includeServed) {
            // Default active queue: exclude finished items
            whereClause.status = { notIn: ["SERVED", "CANCELLED"] as OrderStatus[] };
        } else {
            // History mode: specifically include served items
            whereClause.status = { in: ["SERVED", "CANCELLED"] as OrderStatus[] };
        }

        // Optimized query - only fetch what we need (Oldest first = Priority)
        const orders = await prisma.order.findMany({
            where: whereClause,
            orderBy: { createdAt: "asc" },
            take: 50, // Limit to 50 orders max to prevent heavy queries
            select: {
                id: true,
                orderCode: true,
                status: true,
                paidAt: true,
                totalAmount: true,
                table: {
                    select: {
                        id: true,
                        tableNumber: true,
                    },
                },
                orderItems: {
                    select: {
                        id: true,
                        quantity: true,
                        price: true,
                        notes: true,
                        menu: {
                            select: {
                                id: true,
                                name: true,
                                category: true,
                            },
                        },
                        selectedOptions: {
                            select: {
                                id: true,
                                optionName: true,
                                optionValue: true,
                                priceAdjust: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json({ orders });
    } catch (error) {
        console.error("[GET /api/orders] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

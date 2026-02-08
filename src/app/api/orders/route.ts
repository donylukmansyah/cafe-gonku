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

// POST /api/orders - Create new order (Customer)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Basic validation (Full validation in production with zod)
        const { tableId, items, totalAmount } = body;

        if (!tableId || !items || items.length === 0) {
            return NextResponse.json({ error: "Data pesanan tidak lengkap" }, { status: 400 });
        }

        // Generate Order Code (e.g. GONKU-240208-XYZ)
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
        const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
        const orderCode = `GONKU-${dateStr}-${randomStr}`;

        // Create Order with Items via Transaction
        const order = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    orderCode,
                    tableId,
                    totalAmount,
                    status: "PENDING", // Initial status
                    paymentStatus: "PAID", // SIMULATION: Automatically pay for demo
                    paidAt: new Date(), // Simulating payment
                    orderItems: {
                        create: items.map((item: any) => ({
                            menuId: item.id,
                            quantity: item.quantity,
                            price: item.price,
                            notes: item.notes,
                            selectedOptions: {
                                create: item.selectedOptions.map((opt: any) => ({
                                    optionName: opt.optionName,
                                    optionValue: opt.optionValue,
                                    priceAdjust: opt.priceAdjust,
                                })),
                            },
                        })),
                    },
                },
                include: {
                    orderItems: {
                        include: {
                            menu: true,
                            selectedOptions: true,
                        },
                    },
                    table: true,
                },
            });

            return newOrder;
        });

        // --- Supabase Broadcast for Kitchen ---
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase.channel("kitchen-updates").send({
            type: "broadcast",
            event: "refresh-orders",
            payload: { orderId: order.id, tableNumber: order.table.tableNumber },
        });

        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        console.error("[POST /api/orders] Error:", error);
        return NextResponse.json(
            { error: "Gagal membuat pesanan" },
            { status: 500 }
        );
    }
}

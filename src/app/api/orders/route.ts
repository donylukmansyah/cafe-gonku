import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma, OrderStatus } from "@prisma/client";
import { snap } from "@/lib/midtrans";
import { supabaseAdmin } from "@/lib/supabase";
import { createOrderSchema } from "@/validations/order";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";

// GET /api/orders - Get orders for Kitchen Display (Priority Queue)
export async function GET(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return apiError("Unauthorized", 401);
        }

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "KITCHEN" && userRole !== "ADMIN") {
            return apiError("Forbidden", 403);
        }

        const { searchParams } = new URL(request.url);
        const includeServed = searchParams.get("includeServed") === "true";

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const whereClause: Prisma.OrderWhereInput = {
            paymentStatus: "PAID",
            createdAt: { gte: startOfDay },
        };

        if (!includeServed) {
            whereClause.status = { notIn: ["SERVED", "CANCELLED"] as OrderStatus[] };
        } else {
            whereClause.status = { in: ["SERVED", "CANCELLED"] as OrderStatus[] };
        }

        const orders = await prisma.order.findMany({
            where: whereClause,
            orderBy: [{ paidAt: "asc" }],
            take: 50,
            select: {
                id: true,
                orderCode: true,
                status: true,
                paidAt: true,
                createdAt: true,
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
                        notes: true,
                        menu: {
                            select: {
                                name: true,
                            },
                        },
                        selectedOptions: {
                            select: {
                                id: true,
                                optionName: true,
                                optionValue: true,
                            },
                        },
                    },
                },
            },
        });

        return apiResponse({ orders });
    } catch (error) {
        return handleApiError(error, "GET /api/orders");
    }
}

// POST /api/orders - Create new order (Customer)
// Security Refactor: Move price calculation to server
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validatedData = createOrderSchema.parse(body);
        const { tableId, items } = validatedData;

        // 1. Fetch current prices from DB to prevent client-side manipulation
        const menuIds = items.map(i => i.menuId);
        const menus = await prisma.menu.findMany({
            where: { id: { in: menuIds } },
            include: { menuOptions: { include: { values: true } } }
        });

        let totalAmount = 0;
        const processedItems = items.map((item) => {
            const menu = menus.find(m => m.id === item.menuId);
            if (!menu || !menu.isAvailable) {
                throw new Error(`Menu ${menu?.name || 'tertentu'} sedang tidak tersedia`);
            }

            let itemPrice = menu.price;
            const selectedOptions = (item.selectedOptions || []).map(opt => {
                // Find option value in the DB to get official price adjustment
                const optionValue = (menu as any).menuOptions
                    .flatMap((o: any) => o.values)
                    .find((v: any) => v.id === opt.menuOptionValueId);

                if (!optionValue) {
                    throw new Error(`Opsi "${opt.optionName}" tidak valid`);
                }

                itemPrice += optionValue.priceAdjust;
                return {
                    optionName: opt.optionName,
                    optionValue: opt.optionValue,
                    priceAdjust: optionValue.priceAdjust,
                    menuOptionValueId: opt.menuOptionValueId,
                };
            });

            const itemTotal = itemPrice * item.quantity;
            totalAmount += itemTotal;

            return {
                menuId: item.menuId,
                quantity: item.quantity,
                price: menu.price, // Base price
                notes: item.notes,
                selectedOptions,
            };
        });

        // 2. Generate unique order code
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
        const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
        const orderCode = `GONKU-${dateStr}-${randomStr}`;

        // 3. Create Order
        const order = await prisma.order.create({
            data: {
                orderCode,
                tableId,
                totalAmount,
                status: "PENDING",
                paymentStatus: "PENDING",
                orderItems: {
                    create: processedItems.map(item => ({
                        menuId: item.menuId,
                        quantity: item.quantity,
                        price: item.price,
                        notes: item.notes,
                        selectedOptions: {
                            create: item.selectedOptions
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

        // 4. Initialize Midtrans Transaction
        let snapToken = null;
        let midtransRedirectUrl = null;
        try {
            const parameter = {
                transaction_details: {
                    order_id: orderCode,
                    gross_amount: totalAmount,
                },
                item_details: order.orderItems.map((item: any) => ({
                    id: item.menuId,
                    price: item.price + item.selectedOptions.reduce((acc: number, opt: any) => acc + opt.priceAdjust, 0),
                    quantity: item.quantity,
                    name: item.menu.name.substring(0, 50),
                })),
                customer_details: {
                    first_name: "Customer",
                    last_name: `#${orderCode}`,
                },
            };

            const transaction = await snap.createTransaction(parameter);
            snapToken = transaction.token;
            midtransRedirectUrl = transaction.redirect_url;

            await prisma.order.update({
                where: { id: order.id },
                data: {
                    midtransToken: snapToken,
                    midtransOrderId: orderCode,
                },
            });
        } catch (midtransError) {
            console.error("Midtrans Error:", midtransError);
        }

        // 5. Broadcast to Kitchen (Real-time update)
        if (supabaseAdmin) {
            const { sendBroadcast } = await import("@/lib/supabase");
            await Promise.all([
                sendBroadcast("refresh-orders", { orderId: orderCode, status: "PENDING" }, "kitchen-updates"),
                sendBroadcast("refresh-orders", { orderId: orderCode, status: "PENDING" }, `order-${orderCode}`)
            ]);
        }

        return apiResponse({
            ...order,
            midtransToken: snapToken,
            midtransRedirectUrl: midtransRedirectUrl
        }, 201);

    } catch (error) {
        return handleApiError(error, "POST /api/orders");
    }
}

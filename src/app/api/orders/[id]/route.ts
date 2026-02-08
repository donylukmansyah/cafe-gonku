import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        if (!id) {
            return NextResponse.json({ error: "Order ID or Code required" }, { status: 400 });
        }

        // Try to find by ID first (CUID format), then by Order Code
        let order = await prisma.order.findUnique({
            where: { id },
            select: {
                id: true,
                orderCode: true,
                status: true,
                paymentStatus: true,
                totalAmount: true,
                createdAt: true,
                orderItems: {
                    select: {
                        id: true,
                        quantity: true,
                        price: true,
                        menu: {
                            select: {
                                name: true,
                            },
                        },
                        selectedOptions: {
                            select: {
                                optionValue: true,
                            },
                        },
                    },
                },
            },
        });

        if (!order) {
            // Try matching by Order Code if not found by ID
            order = await prisma.order.findUnique({
                where: { orderCode: id }, // Treating 'id' param as 'orderCode'
                select: {
                    id: true,
                    orderCode: true,
                    status: true,
                    paymentStatus: true,
                    totalAmount: true,
                    createdAt: true,
                    orderItems: {
                        select: {
                            id: true,
                            quantity: true,
                            price: true,
                            menu: {
                                select: {
                                    name: true,
                                },
                            },
                            selectedOptions: {
                                select: {
                                    optionValue: true,
                                },
                            },
                        },
                    },
                },
            });
        }

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error("[GET /api/orders/[id]] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

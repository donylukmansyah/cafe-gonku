import { prisma } from "@/lib/prisma";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        if (!id) {
            return apiError("Order ID or Code required", 400);
        }

        // Try to find by ID first (CUID format), then by Order Code
        let order = await prisma.order.findUnique({
            where: { id },
            select: {
                id: true,
                orderCode: true,
                status: true,
                paymentStatus: true,
                midtransToken: true,
                totalAmount: true,
                createdAt: true,
                customerName: true,
                table: {
                    select: {
                        tableNumber: true,
                    }
                },
                orderItems: {
                    select: {
                        id: true,
                        quantity: true,
                        price: true,
                        notes: true,
                        menu: {
                            select: {
                                name: true,
                            },
                        },
                        selectedOptions: {
                            select: {
                                optionName: true,
                                optionValue: true,
                                priceAdjust: true,
                            },
                        },
                    },
                },
            },
        });

        if (!order) {
            // Try matching by Order Code if not found by ID
            order = await prisma.order.findUnique({
                where: { orderCode: id },
                select: {
                    id: true,
                    orderCode: true,
                    status: true,
                    paymentStatus: true,
                    midtransToken: true,
                    totalAmount: true,
                    createdAt: true,
                    customerName: true,
                    table: {
                        select: {
                            tableNumber: true,
                        }
                    },
                    orderItems: {
                        select: {
                            id: true,
                            quantity: true,
                            price: true,
                            notes: true,
                            menu: {
                                select: {
                                    name: true,
                                },
                            },
                            selectedOptions: {
                                select: {
                                    optionName: true,
                                    optionValue: true,
                                    priceAdjust: true,
                                },
                            },
                        },
                    },
                },
            });
        }

        if (!order) {
            return apiError("Order not found", 404);
        }

        return apiResponse(order);
    } catch (error) {
        return handleApiError(error, "GET /api/orders/[id]");
    }
}

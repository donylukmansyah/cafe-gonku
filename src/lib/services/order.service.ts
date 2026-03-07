import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { snap } from "@/lib/midtrans";
import { supabaseAdmin, sendBroadcast } from "@/lib/supabase";
import { CreateOrderInput } from "@/validations/order";
import { after } from "next/server";

export class OrderService {
    static async getOrders(includeServed: boolean) {
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

        return await prisma.order.findMany({
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
                table: { select: { id: true, tableNumber: true } },
                orderItems: {
                    select: {
                        id: true,
                        quantity: true,
                        notes: true,
                        menu: { select: { name: true } },
                        selectedOptions: {
                            select: { id: true, optionName: true, optionValue: true }
                        }
                    }
                }
            }
        });
    }

    static async getOrderByIdOrCode(idOrCode: string) {
        let order = await prisma.order.findUnique({
            where: { id: idOrCode },
            select: this.getOrderSelectForDetails(),
        });

        if (!order) {
            order = await prisma.order.findUnique({
                where: { orderCode: idOrCode },
                select: this.getOrderSelectForDetails(),
            });
        }

        return order;
    }

    private static getOrderSelectForDetails() {
        return {
            id: true,
            orderCode: true,
            status: true,
            paymentStatus: true,
            midtransToken: true,
            totalAmount: true,
            createdAt: true,
            customerName: true,
            table: { select: { tableNumber: true } },
            orderItems: {
                select: {
                    id: true,
                    quantity: true,
                    price: true,
                    notes: true,
                    menu: { select: { name: true } },
                    selectedOptions: {
                        select: { optionName: true, optionValue: true, priceAdjust: true }
                    }
                }
            }
        };
    }

    static async createOrder(data: CreateOrderInput) {
        const { tableId, items } = data;

        const recentOrder = await prisma.order.findFirst({
            where: {
                tableId,
                status: "PENDING",
                createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }
            }
        });

        if (recentOrder) {
            throw new Error("Sudah ada pesanan yang sedang diproses untuk meja ini. Tunggu sebentar.");
        }

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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                price: menu.price,
                notes: item.notes,
                selectedOptions,
            };
        });

        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
        const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
        const orderCode = `GONKU-${dateStr}-${randomStr}`;

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
                        selectedOptions: { create: item.selectedOptions },
                    })),
                },
            },
            include: {
                orderItems: { include: { menu: true, selectedOptions: true } },
                table: true,
            },
        });

        let snapToken = null;
        let midtransRedirectUrl = null;
        try {
            const parameter = {
                transaction_details: {
                    order_id: orderCode,
                    gross_amount: totalAmount,
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                item_details: order.orderItems.map((item: any) => ({
                    id: item.menuId,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                data: { midtransToken: snapToken, midtransOrderId: orderCode },
            });
        } catch (midtransError) {
            console.error("Midtrans Error:", midtransError);
        }

        if (supabaseAdmin) {
            after(async () => {
                await Promise.all([
                    sendBroadcast("refresh-orders", { orderId: orderCode, status: "PENDING" }, "kitchen-updates"),
                    sendBroadcast("refresh-orders", { orderId: orderCode, status: "PENDING" }, `order-${orderCode}`)
                ]);
            });
        }

        return {
            ...order,
            midtransToken: snapToken,
            midtransRedirectUrl: midtransRedirectUrl
        };
    }

    static async updateOrderStatus(id: string, status: OrderStatus, userId: string) {
        const existingOrder = await prisma.order.findUnique({
            where: { id },
            select: { id: true, status: true, orderCode: true },
        });

        if (!existingOrder) throw new Error("Order not found");

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status },
            include: {
                table: { select: { id: true, tableNumber: true } },
                orderItems: {
                    include: {
                        menu: { select: { id: true, name: true, category: true } },
                        selectedOptions: true,
                    },
                },
            },
        });

        await prisma.orderLog.create({
            data: {
                orderId: id,
                status,
                message: `Order status updated to ${status}`,
                createdBy: userId,
            },
        });

        const payload = { orderId: existingOrder.orderCode, status };
        await Promise.all([
            sendBroadcast("refresh-orders", payload, "kitchen-updates"),
            sendBroadcast("refresh-orders", payload, `order-${existingOrder.orderCode}`)
        ]);

        return updatedOrder;
    }

    static async checkPaymentStatus(idOrCode: string) {
        const order = await prisma.order.findFirst({
            where: { OR: [{ id: idOrCode }, { orderCode: idOrCode }] }
        });

        if (!order) throw new Error("Order not found");

        if (order.paymentStatus === "PAID") {
            if (supabaseAdmin) {
                await sendBroadcast("refresh-orders", { orderId: order.orderCode, status: "PAID" }, `order-${order.orderCode}`);
            }
            return { status: "PAID", message: "Already paid", updated: false };
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const statusResponse = await (snap as any).transaction.status(order.orderCode);
            const { transaction_status, fraud_status, payment_type } = statusResponse;

            let paymentStatus: "PENDING" | "PAID" | "FAILED" | "EXPIRED" = "PENDING";
            let orderStatus: "PENDING" | "PAID" | "CANCELLED" = "PENDING";

            switch (transaction_status) {
                case "capture":
                    if (fraud_status === "challenge") paymentStatus = "PENDING";
                    else { paymentStatus = "PAID"; orderStatus = "PAID"; }
                    break;
                case "settlement":
                    paymentStatus = "PAID"; orderStatus = "PAID";
                    break;
                case "pending":
                    paymentStatus = "PENDING"; orderStatus = "PENDING";
                    break;
                case "deny":
                case "cancel":
                    paymentStatus = "FAILED"; orderStatus = "CANCELLED";
                    break;
                case "expire":
                    paymentStatus = "EXPIRED"; orderStatus = "CANCELLED";
                    break;
            }

            if (paymentStatus !== order.paymentStatus) {
                const updatedOrder = await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        paymentStatus: paymentStatus as PaymentStatus,
                        status: (paymentStatus === "PAID" ? "PAID" : orderStatus) as OrderStatus,
                        paidAt: paymentStatus === "PAID" ? new Date() : order.paidAt,
                        paymentMethod: payment_type || order.paymentMethod
                    },
                    include: {
                        table: { select: { id: true, tableNumber: true } },
                        orderItems: {
                            select: {
                                id: true, quantity: true, price: true, notes: true,
                                menu: { select: { id: true, name: true, category: true } },
                                selectedOptions: { select: { id: true, optionName: true, optionValue: true, priceAdjust: true } },
                            },
                        },
                    }
                });

                if (supabaseAdmin) {
                    const broadcastPayload = {
                        orderId: order.orderCode,
                        status: paymentStatus,
                        fullOrder: paymentStatus === "PAID" ? updatedOrder : undefined
                    };

                    await Promise.all([
                        sendBroadcast("refresh-orders", { orderId: order.orderCode, status: paymentStatus }, `order-${order.orderCode}`),
                        sendBroadcast("refresh-orders", broadcastPayload, "kitchen-updates")
                    ]);
                }

                return { status: paymentStatus, updated: true, message: `Status updated to ${paymentStatus}` };
            }

            return { status: paymentStatus, updated: false, message: "Status same as database" };
        } catch (error: any) {
            if (error?.httpStatusCode == 404 || error?.status_code == "404") {
                return { status: "PENDING", updated: false, message: "Transaction not found in Midtrans yet" };
            }
            throw error;
        }
    }

    static async cancelOrder(idOrCode: string) {
        const existingOrder = await prisma.order.findFirst({
            where: { orderCode: idOrCode },
            select: { id: true, status: true, paymentStatus: true, orderCode: true }
        });

        if (!existingOrder) throw new Error("Order not found");

        if (existingOrder.status !== "PENDING" || existingOrder.paymentStatus !== "PENDING") {
            const error: any = new Error("Pesanan tidak dapat dibatalkan (Sudah dibayar atau diproses).");
            error.status = 400; // Custom error status to pass to HTTP response
            throw error;
        }

        const updatedOrder = await prisma.order.update({
            where: { id: existingOrder.id },
            data: { status: "CANCELLED", paymentStatus: "FAILED" }
        });

        await Promise.all([
            sendBroadcast("refresh-orders", { orderId: existingOrder.orderCode, status: "CANCELLED" }, "kitchen-updates"),
            sendBroadcast("refresh-orders", { orderId: existingOrder.orderCode, status: "CANCELLED" }, `order-${existingOrder.orderCode}`)
        ]);

        return updatedOrder;
    }

    static async syncPendingPayments() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const pendingOrders = await prisma.order.findMany({
            where: { paymentStatus: "PENDING", createdAt: { gte: yesterday } },
            take: 20
        });

        if (pendingOrders.length === 0) {
            return { totalChecked: 0, updatedCount: 0, details: [] };
        }

        let updatedCount = 0;
        const checkPromises = pendingOrders.map(async (order) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const statusResponse = await (snap as any).transaction.status(order.orderCode);
                const { transaction_status, fraud_status, payment_type } = statusResponse;

                let paymentStatus: "PENDING" | "PAID" | "FAILED" | "EXPIRED" = "PENDING";
                let orderStatus: "PENDING" | "PAID" | "CANCELLED" = "PENDING";

                switch (transaction_status) {
                    case "capture":
                        if (fraud_status === "challenge") paymentStatus = "PENDING";
                        else { paymentStatus = "PAID"; orderStatus = "PAID"; }
                        break;
                    case "settlement":
                        paymentStatus = "PAID"; orderStatus = "PAID"; break;
                    case "pending":
                        paymentStatus = "PENDING"; break;
                    case "deny":
                    case "cancel":
                        paymentStatus = "FAILED"; orderStatus = "CANCELLED"; break;
                    case "expire":
                        paymentStatus = "EXPIRED"; orderStatus = "CANCELLED"; break;
                }

                if (paymentStatus !== "PENDING" && paymentStatus !== order.paymentStatus) {
                    const updatedOrder = await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            paymentStatus: paymentStatus as PaymentStatus,
                            status: (paymentStatus === "PAID" ? "PAID" : orderStatus) as OrderStatus,
                            paidAt: paymentStatus === "PAID" ? new Date() : null,
                            paymentMethod: payment_type || order.paymentMethod
                        },
                        include: {
                            table: { select: { id: true, tableNumber: true } },
                            orderItems: {
                                select: {
                                    id: true, quantity: true, price: true, notes: true,
                                    menu: { select: { id: true, name: true, category: true } },
                                    selectedOptions: { select: { id: true, optionName: true, optionValue: true, priceAdjust: true } },
                                },
                            },
                        }
                    });

                    if (supabaseAdmin) {
                        const payload = {
                            orderId: order.orderCode,
                            status: paymentStatus,
                            fullOrder: paymentStatus === "PAID" ? updatedOrder : undefined
                        };
                        await Promise.all([
                            sendBroadcast("refresh-orders", payload, `order-${order.orderCode}`),
                            sendBroadcast("refresh-orders", payload, "kitchen-updates")
                        ]);
                    }
                    updatedCount++;
                    return { orderId: order.orderCode, status: paymentStatus, updated: true };
                }
                return { orderId: order.orderCode, status: "PENDING", updated: false };
            } catch (error: any) {
                if (error?.httpStatusCode == 404 || error?.status_code == "404") {
                    return { orderId: order.orderCode, error: "Not found in Midtrans" };
                }
                return { orderId: order.orderCode, error: "Check failed" };
            }
        });

        const checks = await Promise.all(checkPromises);

        return { totalChecked: pendingOrders.length, updatedCount, details: checks };
    }
}

import { z } from "zod"

// Order status enum matching Prisma schema
export const orderStatusSchema = z.enum([
    "PENDING",
    "PAID",
    "PREPARING",
    "READY",
    "SERVED",
    "CANCELLED",
]);

export const paymentStatusSchema = z.enum([
    "PENDING",
    "PAID",
    "FAILED",
    "EXPIRED",
]);

export const orderServiceTypeSchema = z.enum(["DINE_IN", "TAKEAWAY"]);

// Schema for updating order status (Kitchen)
export const updateOrderStatusSchema = z.object({
    status: orderStatusSchema,
});

export const bulkUpdateOrderStatusSchema = z.object({
    orderIds: z.array(z.string().cuid()).min(1).max(50),
    status: orderStatusSchema,
});

// Schema for creating a new order (Customer)
export const createOrderSchema = z.object({
    tableId: z.string().cuid(),
    serviceType: orderServiceTypeSchema.default("DINE_IN"),
    items: z.array(
        z.object({
            menuId: z.string().cuid(),
            quantity: z.number().int().min(1).max(99),
            notes: z.string().trim().max(500).optional().transform(val => val?.replace(/<[^>]*>?/gm, "")),
            selectedOptions: z.array(
                z.object({
                    menuOptionValueId: z.string().cuid(),
                    optionName: z.string().trim().transform(val => val.replace(/<[^>]*>?/gm, "")),
                    optionValue: z.string().trim().transform(val => val.replace(/<[^>]*>?/gm, "")),
                    priceAdjust: z.number().int(),
                })
            ).optional(),
        })
    ).min(1),
    serviceFee: z.number().int().min(0).optional(),
    rounding: z.number().int().optional(),
    priceHash: z.string().optional(),
    checkoutId: z.string().uuid().optional(),
});

// Types
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type OrderServiceType = z.infer<typeof orderServiceTypeSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

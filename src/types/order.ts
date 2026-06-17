import { Order, OrderItem, OrderItemOption, Menu, Table } from "@prisma/client";

export type OrderWithDetails = Order & {
    orderItems: (OrderItem & {
        menu: Menu;
        selectedOptions: OrderItemOption[];
    })[];
    table: Table;
};

export interface OrderResponse extends OrderWithDetails {
    /** @deprecated Use paymentRedirectUrl. Kept for backward compatibility with older Midtrans naming. */
    midtransToken: string | null;
    /** @deprecated Use paymentRedirectUrl. Kept for backward compatibility with older Midtrans naming. */
    midtransRedirectUrl: string | null;
    paymentRedirectUrl: string | null;
    paymentGatewayOrderId: string | null;
}

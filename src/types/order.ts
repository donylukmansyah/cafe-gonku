import { Order, OrderItem, OrderItemOption, Menu, Table } from "@prisma/client";

export type OrderWithDetails = Order & {
    orderItems: (OrderItem & {
        menu: Menu;
        selectedOptions: OrderItemOption[];
    })[];
    table: Table;
};

export interface OrderResponse extends OrderWithDetails {
    midtransToken: string | null;
    midtransRedirectUrl: string | null;
}

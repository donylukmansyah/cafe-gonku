import { Prisma } from "@prisma/client";

export const kitchenOrderSelect = {
  id: true,
  orderCode: true,
  status: true,
  paymentStatus: true,
  paidAt: true,
  createdAt: true,
  totalAmount: true,
  serviceType: true,
  priorityScore: true,
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
} satisfies Prisma.OrderSelect;

export const orderDetailsSelect = {
  id: true,
  orderCode: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  paymentRedirectUrl: true,
  totalAmount: true,
  createdAt: true,
  paymentExpiresAt: true,
  paidAt: true,
  serviceType: true,
  table: {
    select: {
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
} satisfies Prisma.OrderSelect;

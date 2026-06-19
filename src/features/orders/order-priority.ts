import { PaymentStatus } from "@prisma/client";

export const ORDER_PRIORITY_WEIGHTS = {
  payment: 0.5,
  waitingTime: 0.2,
  urgency: 3,
} as const;

export const ORDER_SERVICE_URGENCY = {
  DINE_IN: 1,
  TAKEAWAY: 2,
} as const;

type PriorityOrderItem = {
  notes: string | null;
};

type CalculateOrderPriorityInput = {
  paymentStatus: PaymentStatus;
  paidAt: Date | null;
  serviceType?: "DINE_IN" | "TAKEAWAY" | null;
  orderItems?: PriorityOrderItem[];
  now?: Date;
};

export function resolveOrderServiceType(
  serviceType?: "DINE_IN" | "TAKEAWAY" | null,
  orderItems: PriorityOrderItem[] = [],
) {
  if (serviceType) return serviceType;

  return orderItems.some((item) => item.notes?.includes("[Bawa Pulang]"))
    ? "TAKEAWAY"
    : "DINE_IN";
}

export function calculateOrderPriorityScore({
  paymentStatus,
  paidAt,
  serviceType,
  orderItems = [],
  now = new Date(),
}: CalculateOrderPriorityInput) {
  const paymentValue = paymentStatus === PaymentStatus.PAID ? 1 : 0;
  const waitingTimeMinutes = paymentValue === 1 && paidAt
    ? Math.max(0, Math.floor((now.getTime() - paidAt.getTime()) / 60_000))
    : 0;
  const urgencyValue = ORDER_SERVICE_URGENCY[resolveOrderServiceType(serviceType, orderItems)];

  return (
    ORDER_PRIORITY_WEIGHTS.payment * paymentValue +
    ORDER_PRIORITY_WEIGHTS.waitingTime * waitingTimeMinutes +
    ORDER_PRIORITY_WEIGHTS.urgency * urgencyValue
  );
}

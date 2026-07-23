import { PaymentStatus } from "@prisma/client";

// File ini menghitung angka priorityScore dari data order.
// Rumus: P_i = (w1 × K_i) + (w2 × T_i) + (w3 × U_i).
export const ORDER_PRIORITY_WEIGHTS = {
  payment: 0.5,
  waitingTime: 0.5,
  urgency: 3,
} as const;

// U_i: TAKEAWAY lebih tinggi, DINE_IN tetap bisa naik lewat waktu tunggu.
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

  // Fallback untuk order lama: kalau serviceType kosong, baca marker takeaway dari notes.
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
  // K_i: PAID = 1, belum bayar = 0.
  const paymentValue = paymentStatus === PaymentStatus.PAID ? 1 : 0;

  // T_i: lama tunggu sejak paidAt, dihitung menit agar score naik seiring waktu.
  const waitingTimeMinutes = paymentValue === 1 && paidAt
    ? Math.max(0, Math.floor((now.getTime() - paidAt.getTime()) / 60_000))
    : 0;

  // U_i: tipe pesanan. TAKEAWAY dapat nilai awal lebih tinggi dari DINE_IN.
  const urgencyValue = ORDER_SERVICE_URGENCY[resolveOrderServiceType(serviceType, orderItems)];

  // Hasil ini dipakai kitchen queue untuk menentukan urutan pesanan.
  return (
    ORDER_PRIORITY_WEIGHTS.payment * paymentValue +
    ORDER_PRIORITY_WEIGHTS.waitingTime * waitingTimeMinutes +
    ORDER_PRIORITY_WEIGHTS.urgency * urgencyValue
  );
}

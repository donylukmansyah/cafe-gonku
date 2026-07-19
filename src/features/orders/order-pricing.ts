import type { CartItem } from "@/features/orders/hooks/use-cart";

export const SERVICE_FEE_RATE = 0.1;
export const ROUND_TO = 1000;

export function calculatePaymentBreakdown(subtotal: number) {
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const beforeRounding = subtotal + serviceFee;
  const grandTotal = Math.round(beforeRounding / ROUND_TO) * ROUND_TO;
  const rounding = grandTotal - beforeRounding;

  return {
    subtotal,
    serviceFee,
    beforeRounding,
    grandTotal,
    rounding,
  };
}

export function calculateCartSubtotal(items: CartItem[]) {
  return items.reduce((acc, item) => {
    const optionsPrice = item.selectedOptions.reduce(
      (optAcc, opt) => optAcc + opt.priceAdjust,
      0,
    );
    return acc + (item.price + optionsPrice) * item.quantity;
  }, 0);
}

export function calculateOrderSubtotal(
  items: {
    price: number;
    quantity: number;
    selectedOptions: { priceAdjust: number }[];
  }[],
) {
  return items.reduce((acc, item) => {
    const optionsPrice = item.selectedOptions.reduce(
      (optAcc, opt) => optAcc + opt.priceAdjust,
      0,
    );
    return acc + (item.price + optionsPrice) * item.quantity;
  }, 0);
}

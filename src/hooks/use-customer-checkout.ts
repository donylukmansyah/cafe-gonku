import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { calculateCartSubtotal, calculatePaymentBreakdown } from "@/lib/order-pricing";
import type { CartItem } from "@/hooks/use-cart";
import type { OrderResponse } from "@/types/order";

type VerifyPricesResult = {
  verified: boolean;
  changes: {
    menuId: string;
    name: string;
    oldPrice: number;
    newPrice: number;
    unavailable?: boolean;
    optionChanges?: { valueId: string; oldAdjust: number; newAdjust: number }[];
  }[];
  priceHash?: string;
};

export function useCustomerCheckout({
  tableId,
  items,
  diningType,
  clearCart,
  updateItemPrices,
  removeItemsByMenuId,
  setActiveOrderCode,
  setOrderAccessToken,
  onPaymentStart,
  openDokuCheckout,
}: {
  tableId: string;
  items: CartItem[];
  diningType: "DINE_IN" | "TAKEAWAY";
  clearCart: () => void;
  updateItemPrices: (updates: { menuId: string; newPrice: number; optionChanges?: { valueId: string; newAdjust: number }[] }[]) => void;
  removeItemsByMenuId: (menuId: string) => void;
  setActiveOrderCode: (code: string | null) => void;
  setOrderAccessToken: (orderCode: string, token: string) => void;
  onPaymentStart: () => void;
  openDokuCheckout: (paymentUrl: string) => boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const checkoutIdRef = useRef<string | null>(null);

  const formatPrice = useCallback(
    (price: number) => `Rp ${price.toLocaleString("id-ID")}`,
    [],
  );

  useEffect(() => {
    if (items.length === 0) {
      checkoutIdRef.current = null;
    }
  }, [items.length]);

  const handleCheckout = useCallback(async () => {
    if (submitLockRef.current || isSubmitting) {
      return;
    }

    if (!tableId) {
      toast.error("Silakan scan QR Code meja dulu ya!");
      return;
    }

    if (items.length === 0) {
      toast.error("Keranjang masih kosong.");
      return;
    }

    submitLockRef.current = true;
    checkoutIdRef.current ??= crypto.randomUUID();

    try {
      setIsSubmitting(true);

      const verifyResult = await apiFetch<VerifyPricesResult>("/api/menus/verify-prices", {
        method: "POST",
        body: JSON.stringify({
          tableId,
          items: items.map((item) => ({
            menuId: item.id,
            price: item.price,
            selectedOptions: item.selectedOptions.map((opt) => ({
              valueId: opt.valueId,
              priceAdjust: opt.priceAdjust,
            })),
          })),
        }),
        silent: true,
      });

      if (!verifyResult.verified) {
        const unavailableItems = verifyResult.changes.filter((c) => c.unavailable);
        const priceChangedItems = verifyResult.changes.filter((c) => !c.unavailable);

        for (const item of unavailableItems) {
          removeItemsByMenuId(item.menuId);
        }

        if (priceChangedItems.length > 0) {
          updateItemPrices(
            priceChangedItems.map((c) => ({
              menuId: c.menuId,
              newPrice: c.newPrice,
              optionChanges: c.optionChanges?.map((o) => ({
                valueId: o.valueId,
                newAdjust: o.newAdjust,
              })),
            })),
          );
        }

        const messages = [
          ...unavailableItems.map(
            (item) => `"${item.name}" sudah tidak tersedia dan dihapus dari keranjang.`,
          ),
          ...priceChangedItems.map(
            (item) =>
              `"${item.name}" harganya berubah: ${formatPrice(item.oldPrice)} → ${formatPrice(item.newPrice)}`,
          ),
        ];

        toast.warning("Ada perubahan harga!", {
          description: messages.join("\n"),
          duration: 6000,
        });
        checkoutIdRef.current = null;
        return;
      }

      const subtotal = calculateCartSubtotal(items);
      const { serviceFee, rounding } = calculatePaymentBreakdown(subtotal);
      const diningPrefix = diningType === "DINE_IN" ? "[Makan di Tempat]" : "[Bawa Pulang]";

      const order = await apiFetch<OrderResponse>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          tableId,
          serviceType: diningType,
          items: items.map((item) => ({
            menuId: item.id,
            quantity: item.quantity,
            notes: `${diningPrefix}${item.notes ? ` \nCatatan Item: ${item.notes}` : ""}`,
            selectedOptions: item.selectedOptions.map((opt) => ({
              menuOptionValueId: opt.valueId,
              optionName: opt.optionName,
              optionValue: opt.optionValue,
              priceAdjust: opt.priceAdjust,
            })),
          })),
          serviceFee,
          rounding,
          priceHash: verifyResult.priceHash,
          checkoutId: checkoutIdRef.current,
        }),
      });

      if (order.accessToken) {
        setOrderAccessToken(order.orderCode, order.accessToken);
      }

      setActiveOrderCode(order.orderCode);
      clearCart();
      onPaymentStart();

      const paymentUrl = order.paymentRedirectUrl;
      if (paymentUrl) {
        openDokuCheckout(paymentUrl);
      }
    } catch {
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    tableId,
    isSubmitting,
    items,
    diningType,
    formatPrice,
    clearCart,
    updateItemPrices,
    removeItemsByMenuId,
    setActiveOrderCode,
    setOrderAccessToken,
    onPaymentStart,
    openDokuCheckout,
  ]);

  return { isSubmitting, handleCheckout };
}

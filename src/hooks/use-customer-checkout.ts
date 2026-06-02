import { useCallback, useState } from "react";
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
  snapPay,
  clearCart,
  updateItemPrices,
  removeItemsByMenuId,
  setActiveOrderCode,
  setOrderAccessToken,
  onPaymentStart,
  onOrderCreated,
}: {
  tableId: string;
  items: CartItem[];
  diningType: "DINE_IN" | "TAKEAWAY";
  snapPay: (token: string, callbacks: Record<string, () => void | Promise<void>>) => void;
  clearCart: () => void;
  updateItemPrices: (updates: { menuId: string; newPrice: number; optionChanges?: { valueId: string; newAdjust: number }[] }[]) => void;
  removeItemsByMenuId: (menuId: string) => void;
  setActiveOrderCode: (code: string | null) => void;
  setOrderAccessToken: (orderCode: string, token: string) => void;
  onPaymentStart: () => void;
  onOrderCreated: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPrice = useCallback(
    (price: number) => `Rp ${price.toLocaleString("id-ID")}`,
    [],
  );

  const handleCheckout = useCallback(async () => {
    if (!tableId) {
      toast.error("Silakan scan QR Code meja dulu ya!");
      return;
    }

    try {
      setIsSubmitting(true);

      const verifyResult = await apiFetch<VerifyPricesResult>("/api/menus/verify-prices", {
        method: "POST",
        body: JSON.stringify({
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
        return;
      }

      const subtotal = calculateCartSubtotal(items);
      const { serviceFee, rounding } = calculatePaymentBreakdown(subtotal);
      const diningPrefix = diningType === "DINE_IN" ? "[Makan di Tempat]" : "[Bawa Pulang]";

      const order = await apiFetch<OrderResponse>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          tableId,
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
        }),
      });

      if (order.accessToken) {
        setOrderAccessToken(order.orderCode, order.accessToken);
      }

      if (order.midtransToken) {
        setIsSubmitting(false);
        onPaymentStart();

        snapPay(order.midtransToken, {
          onSuccess: async () => {
            toast.success("Pembayaran Berhasil!");

            try {
              const headers: Record<string, string> = {};
              if (order.accessToken) {
                headers["x-order-token"] = order.accessToken;
              }
              await apiFetch(`/api/orders/${order.orderCode}/check-payment`, {
                method: "POST",
                headers,
              });
            } catch (error) {
              console.error("Proactive check-payment failed:", error);
            }

            setActiveOrderCode(order.orderCode);
            clearCart();
          },
          onPending: async () => {
            toast.info("Menunggu Pembayaran...");
            setActiveOrderCode(order.orderCode);
            clearCart();
          },
          onError: () => {
            toast.error("Pembayaran Gagal");
            setActiveOrderCode(order.orderCode);
            clearCart();
          },
          onClose: () => {
            toast.warning("Pembayaran belum selesai");
            setActiveOrderCode(order.orderCode);
            clearCart();
          },
        });
      } else {
        setActiveOrderCode(order.orderCode);
        toast.success("Pesanan berhasil dikirim ke dapur!");
        clearCart();
        onOrderCreated();
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  }, [
    tableId,
    items,
    diningType,
    formatPrice,
    snapPay,
    clearCart,
    updateItemPrices,
    removeItemsByMenuId,
    setActiveOrderCode,
    setOrderAccessToken,
    onPaymentStart,
    onOrderCreated,
  ]);

  return { isSubmitting, handleCheckout };
}

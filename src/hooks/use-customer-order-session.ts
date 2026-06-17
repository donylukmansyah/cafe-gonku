import { useEffect } from "react";
import { toast } from "sonner";
import { getOrderCookie } from "@/lib/order-cookie";

export function useCustomerOrderSession({
  tableId,
  tableQrCode,
  currentTableId,
  hasHydrated,
  activeOrderCode,
  setTableId,
  clearCart,
  setActiveOrderCode,
  setOrderAccessToken,
}: {
  tableId: string;
  tableQrCode: string;
  currentTableId: string | null;
  hasHydrated: boolean;
  activeOrderCode: string | null;
  setTableId: (id: string | null, qrCode?: string | null) => void;
  clearCart: () => void;
  setActiveOrderCode: (code: string | null) => void;
  setOrderAccessToken: (orderCode: string, token: string) => void;
}) {
  useEffect(() => {
    if (!hasHydrated) return;

    if (tableId && currentTableId !== tableId) {
      clearCart();
      setTableId(tableId, tableQrCode);
    } else if (tableQrCode) {
      setTableId(tableId, tableQrCode);
    }
  }, [hasHydrated, tableId, tableQrCode, currentTableId, setTableId, clearCart]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (activeOrderCode) return;

    const cookie = getOrderCookie();
    if (cookie) {
      setOrderAccessToken(cookie.orderCode, cookie.accessToken);
      setActiveOrderCode(cookie.orderCode);
    }
  }, [hasHydrated, activeOrderCode, setActiveOrderCode, setOrderAccessToken]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get("order_id");
    const statusParam = params.get("transaction_status");

    if (!orderIdParam) return;

    setActiveOrderCode(orderIdParam);
    clearCart();
    window.history.replaceState({}, "", window.location.pathname);

    if (statusParam === "settlement" || statusParam === "capture") {
      toast.success("Pembayaran Berhasil! Pesanan diproses");
    } else if (statusParam === "pending") {
      toast.info("Sedang memverifikasi pembayaran...");
    }
  }, [setActiveOrderCode, clearCart]);
}

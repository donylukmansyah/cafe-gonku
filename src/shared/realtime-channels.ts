export const REALTIME_CHANNELS = {
  kitchenUpdates: "kitchen-updates",
  menuUpdates: "menu-updates",
  order(orderCode: string) {
    return `order-${orderCode}`;
  },
} as const;

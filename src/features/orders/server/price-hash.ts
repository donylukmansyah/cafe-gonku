import crypto from "crypto";

export interface PriceHashItem {
  menuId: string;
  price: number;
  selectedOptions: { valueId: string; priceAdjust: number }[];
}

export function computePriceHash(items: PriceHashItem[]): string {
  const sortedItems = [...items].sort((a, b) =>
    a.menuId.localeCompare(b.menuId),
  );
  const itemsStr = sortedItems
    .map((item) => {
      const sortedOpts = [...(item.selectedOptions || [])].sort((a, b) =>
        a.valueId.localeCompare(b.valueId),
      );
      const optsStr = sortedOpts
        .map((o) => `${o.valueId}_${o.priceAdjust}`)
        .join(",");
      return `${item.menuId}:${item.price}:${optsStr}`;
    })
    .join("|");
  return crypto.createHash("sha256").update(itemsStr).digest("hex");
}

export function buildPriceHashItems(
  cartItems: {
    menuId: string;
    selectedOptions?: { valueId: string }[];
  }[],
  menuMap: Map<
    string,
    {
      price: number;
      menuOptions: { values: { id: string; priceAdjust: number }[] }[];
    }
  >,
): PriceHashItem[] {
  return cartItems.map((item) => {
    const menu = menuMap.get(item.menuId);
    if (!menu) throw new Error("Menu tidak ditemukan");

    const valueMap = new Map<string, number>();
    for (const opt of menu.menuOptions) {
      for (const v of opt.values) {
        valueMap.set(v.id, v.priceAdjust);
      }
    }

    const selectedOptions = (item.selectedOptions ?? []).map((opt) => ({
      valueId: opt.valueId,
      priceAdjust: valueMap.get(opt.valueId) ?? 0,
    }));

    return {
      menuId: item.menuId,
      price: menu.price,
      selectedOptions,
    };
  });
}

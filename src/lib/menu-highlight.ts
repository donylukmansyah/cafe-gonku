import type { MenuHighlightType } from "@/types/menu";

export const MENU_HIGHLIGHT_META: Record<
  MenuHighlightType,
  { label: string; className: string; order: number }
> = {
  NONE: {
    label: "Regular",
    className: "bg-zinc-800 text-zinc-300 border-zinc-700",
    order: 99,
  },
  BEST_SELLER: {
    label: "Best Seller",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    order: 0,
  },
  RECOMMENDED: {
    label: "Recommended",
    className: "bg-primary/15 text-primary border-primary/30",
    order: 1,
  },
  DELICIOUS: {
    label: "Delicious",
    className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    order: 2,
  },
};

export const MENU_HIGHLIGHT_OPTIONS = (
  Object.entries(MENU_HIGHLIGHT_META) as Array<
    [MenuHighlightType, (typeof MENU_HIGHLIGHT_META)[MenuHighlightType]]
  >
).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

export function isHighlightedMenu(highlightType: MenuHighlightType) {
  return highlightType !== "NONE";
}

import type { MenuHighlightType } from "@/features/menus/types";

export const MENU_HIGHLIGHT_META: Record<
  MenuHighlightType,
  { label: string; shortLabel: string; className: string; order: number }
> = {
  NONE: {
    label: "Regular",
    shortLabel: "Reg",
    className:
      "bg-white/10 text-zinc-200 border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_24px_rgba(0,0,0,0.24)]",
    order: 99,
  },
  BEST_SELLER: {
    label: "Best Seller",
    shortLabel: "Best",
    className:
      "bg-orange-400/15 text-orange-100 border-orange-200/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_26px_rgba(249,115,22,0.18)]",
    order: 0,
  },
  RECOMMENDED: {
    label: "Recommended",
    shortLabel: "Recommend",
    className:
      "bg-primary/15 text-primary border-primary/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_26px_rgba(53,183,24,0.18)]",
    order: 1,
  },
  DELICIOUS: {
    label: "Delicious",
    shortLabel: "Fav",
    className:
      "bg-amber-400/15 text-amber-100 border-amber-200/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_26px_rgba(245,158,11,0.18)]",
    order: 2,
  },
};

export const MENU_HIGHLIGHT_OPTIONS = ([
  "NONE",
  "BEST_SELLER",
  "RECOMMENDED",
  "DELICIOUS",
] as const).map((value) => ({
  value,
  label: MENU_HIGHLIGHT_META[value].label,
}));

export function isHighlightedMenu(highlightType: MenuHighlightType) {
  return highlightType !== "NONE";
}

"use client";

import type { MenuHighlightType } from "@/features/menus/types";
import { MENU_HIGHLIGHT_META, isHighlightedMenu } from "@/features/menus/menu-highlight";
import { cn } from "@/shared/utils";
import { Badge } from "@/components/ui/badge";

interface MenuHighlightBadgeProps {
  highlightType: MenuHighlightType;
  className?: string;
  compact?: boolean;
}

export function MenuHighlightBadge({
  highlightType,
  className,
  compact = false,
}: MenuHighlightBadgeProps) {
  if (!isHighlightedMenu(highlightType)) {
    return null;
  }

  const meta = MENU_HIGHLIGHT_META[highlightType];

  return (
    <Badge
      className={cn(
        "border text-[9px] font-black uppercase tracking-[0.2em] backdrop-blur-xl supports-[backdrop-filter]:bg-opacity-70",
        meta.className,
        className,
      )}
    >
      {compact ? meta.shortLabel : meta.label}
    </Badge>
  );
}

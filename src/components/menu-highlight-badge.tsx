"use client";

import type { MenuHighlightType } from "@/types/menu";
import { MENU_HIGHLIGHT_META, isHighlightedMenu } from "@/lib/menu-highlight";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface MenuHighlightBadgeProps {
  highlightType: MenuHighlightType;
  className?: string;
}

export function MenuHighlightBadge({
  highlightType,
  className,
}: MenuHighlightBadgeProps) {
  if (!isHighlightedMenu(highlightType)) {
    return null;
  }

  const meta = MENU_HIGHLIGHT_META[highlightType];

  return (
    <Badge
      className={cn(
        "border text-[9px] font-black uppercase tracking-[0.2em]",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </Badge>
  );
}

import { useMemo } from "react";
import { Coffee, Cookie, IceCream, LayoutGrid, Utensils } from "lucide-react";
import type { Menu } from "@/types/menu";

function getCategoryIcon(category: string) {
  switch (category) {
    case "FOOD":
      return Utensils;
    case "DRINK":
      return Coffee;
    case "SNACK":
      return Cookie;
    case "DESSERT":
      return IceCream;
    default:
      return LayoutGrid;
  }
}

export function useMenuFilter(
  menus: Menu[],
  activeCategory: string,
  searchQuery: string,
) {
  const categories = useMemo(() => ([
    { id: "ALL", label: "Semua", icon: LayoutGrid },
    { id: "FOOD", label: "FOOD", icon: getCategoryIcon("FOOD") },
    { id: "DRINK", label: "DRINK", icon: getCategoryIcon("DRINK") },
    { id: "SNACK", label: "SNACK", icon: getCategoryIcon("SNACK") },
    { id: "DESSERT", label: "DESSERT", icon: getCategoryIcon("DESSERT") },
  ]), []);

  return { categories, filteredMenus: menus, activeCategory, searchQuery };
}

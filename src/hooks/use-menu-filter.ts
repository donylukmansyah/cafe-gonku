import { useMemo } from "react";
import { Coffee, Cookie, IceCream, LayoutGrid, Utensils } from "lucide-react";
import { fuzzyMatch } from "@/lib/fuzzy-match";
import { useDebounce } from "@/hooks/use-debounce";
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
  const debouncedSearchQuery = useDebounce(searchQuery, 250);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(menus.map((m) => m.category))).sort();

    return [
      { id: "ALL", label: "Semua", icon: LayoutGrid },
      ...uniqueCategories.map((cat) => ({
        id: cat,
        label: cat,
        icon: getCategoryIcon(cat),
      })),
    ];
  }, [menus]);

  const filteredMenus = useMemo(() => {
    return menus.filter((menu) => {
      const matchesCategory = activeCategory === "ALL" || menu.category === activeCategory;
      const matchesSearch = fuzzyMatch(menu.name, debouncedSearchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [menus, activeCategory, debouncedSearchQuery]);

  return { categories, filteredMenus };
}

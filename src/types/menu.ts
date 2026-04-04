export type MenuCategory = "FOOD" | "DRINK" | "SNACK" | "DESSERT";
export type MenuHighlightType =
  | "NONE"
  | "BEST_SELLER"
  | "RECOMMENDED"
  | "DELICIOUS";

export interface Menu {
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    category: MenuCategory;
    isAvailable: boolean;
    isActive: boolean;
    highlightType: MenuHighlightType;
    menuOptions: {
        id: string;
        name: string;
        isRequired: boolean;
        values: {
            id: string;
            label: string;
            priceAdjust: number;
        }[];
    }[];
}

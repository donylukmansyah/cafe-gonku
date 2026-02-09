export interface Menu {
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    category: string; // or "FOOD" | "DRINK" | "SNACK" | "DESSERT" if strict
    isAvailable: boolean;
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

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface Menu {
    id: string;
    name: string;
    description: string | null;
    price: number;
    category: "FOOD" | "DRINK" | "SNACK" | "DESSERT";
    imageUrl: string | null;
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

export function useCustomerMenus() {
    const { data, error, isLoading, mutate } = useSWR<{ menus: Menu[] }>(
        "/api/menus", // Fetch all active menus (including unavailable/sold out)
        fetcher,
        {
            revalidateOnFocus: false, // Don't revalidate when window gains focus (optional)
            dedupingInterval: 60000, // Cache for 1 minute
        }
    );

    return {
        menus: data?.menus || [],
        isLoading,
        error: error ? error.message : null,
        refresh: mutate,
    };
}

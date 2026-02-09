"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
    id: string; // menuId
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    notes?: string;
    selectedOptions: {
        optionId: string;
        valueId: string;
        optionName: string;
        optionValue: string;
        priceAdjust: number;
    }[];
}

interface CartStore {
    items: CartItem[];
    tableId: string | null;
    setTableId: (id: string | null) => void;
    addItem: (item: CartItem) => void;
    removeItem: (itemId: string, optionsHash: string) => void;
    updateQuantity: (itemId: string, optionsHash: string, delta: number) => void;
    clearCart: () => void;
    getTotal: () => number;
    getItemCount: () => number;
    activeOrderCode: string | null;
    setActiveOrderCode: (code: string | null) => void;
    hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

// Helper to generate a unique key for items with the same menuId but different options
export const getOptionsHash = (options: CartItem["selectedOptions"]) => {
    if (!options || options.length === 0) return "none";
    return options
        .filter(o => !!o.valueId) // Defensive: skip old data format
        .sort((a, b) => (a.valueId || "").localeCompare(b.valueId || ""))
        .map((o) => o.valueId)
        .join("|");
};

export const useCart = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            tableId: null,
            setTableId: (id) => set({ tableId: id }),
            addItem: (newItem) => {
                const items = get().items;
                const newHash = getOptionsHash(newItem.selectedOptions);

                const existingIndex = items.findIndex(
                    (item) =>
                        item.id === newItem.id &&
                        getOptionsHash(item.selectedOptions) === newHash &&
                        item.notes === newItem.notes
                );

                if (existingIndex > -1) {
                    const updatedItems = [...items];
                    updatedItems[existingIndex].quantity += newItem.quantity;
                    set({ items: updatedItems });
                } else {
                    set({ items: [...items, newItem] });
                }
            },
            removeItem: (itemId, optionsHash) => {
                set({
                    items: get().items.filter(
                        (item) =>
                            !(item.id === itemId && getOptionsHash(item.selectedOptions) === optionsHash)
                    ),
                });
            },
            updateQuantity: (itemId, optionsHash, delta) => {
                const items = get().items;
                const index = items.findIndex(
                    (item) =>
                        item.id === itemId &&
                        getOptionsHash(item.selectedOptions) === optionsHash
                );

                if (index > -1) {
                    const updatedItems = [...items];
                    const newQty = updatedItems[index].quantity + delta;
                    if (newQty <= 0) {
                        updatedItems.splice(index, 1);
                    } else {
                        updatedItems[index].quantity = newQty;
                    }
                    set({ items: updatedItems });
                }
            },
            clearCart: () => set({ items: [] }),
            getTotal: () => {
                return get().items.reduce((total, item) => {
                    const optionsPrice = item.selectedOptions.reduce((acc, opt) => acc + opt.priceAdjust, 0);
                    return total + (item.price + optionsPrice) * item.quantity;
                }, 0);
            },
            getItemCount: () => {
                return get().items.reduce((count, item) => count + item.quantity, 0);
            },
            activeOrderCode: null,
            setActiveOrderCode: (code) => set({ activeOrderCode: code }),
            hasHydrated: false,
            setHasHydrated: (state) => set({ hasHydrated: state }),
        }),
        {
            name: "cafe-gonku-cart",
            version: 2,
            onRehydrateStorage: (state) => {
                return () => state?.setHasHydrated(true);
            }
        }
    )
);

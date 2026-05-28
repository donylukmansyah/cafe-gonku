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
    editItem: (oldHash: string, newItem: CartItem) => void;
    removeItem: (itemId: string, optionsHash: string) => void;
    updateQuantity: (itemId: string, optionsHash: string, delta: number) => void;
    updateItemPrices: (updates: { menuId: string; newPrice: number; optionChanges?: { valueId: string; newAdjust: number }[] }[]) => void;
    removeItemsByMenuId: (menuId: string) => void;
    clearCart: () => void;
    getTotal: () => number;
    getItemCount: () => number;
    activeOrderCode: string | null;
    setActiveOrderCode: (code: string | null) => void;
    hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    diningType: "DINE_IN" | "TAKEAWAY";
    setDiningType: (type: "DINE_IN" | "TAKEAWAY") => void;
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
                    updatedItems[existingIndex] = {
                        ...updatedItems[existingIndex],
                        quantity: updatedItems[existingIndex].quantity + newItem.quantity
                    };
                    set({ items: updatedItems });
                } else {
                    set({ items: [...items, newItem] });
                }
            },
            editItem: (oldHash, newItem) => {
                const items = get().items;
                const newItems = items.map(item => {
                    if (item.id === newItem.id && getOptionsHash(item.selectedOptions) === oldHash) {
                        return newItem;
                    }
                    return item;
                });
                set({ items: newItems });
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
                        updatedItems[index] = {
                            ...updatedItems[index],
                            quantity: newQty
                        };
                    }
                    set({ items: updatedItems });
                }
            },
            clearCart: () => set({ items: [] }),
            updateItemPrices: (updates) => {
                const items = get().items;
                const updateMap = new Map(updates.map(u => [u.menuId, u]));
                set({
                    items: items.map(item => {
                        const update = updateMap.get(item.id);
                        if (!update) return item;
                        const optChangeMap = new Map(
                            (update.optionChanges ?? []).map(o => [o.valueId, o.newAdjust])
                        );
                        return {
                            ...item,
                            price: update.newPrice,
                            selectedOptions: item.selectedOptions.map(opt => {
                                const newAdjust = optChangeMap.get(opt.valueId);
                                return newAdjust !== undefined ? { ...opt, priceAdjust: newAdjust } : opt;
                            }),
                        };
                    }),
                });
            },
            removeItemsByMenuId: (menuId) => {
                set({ items: get().items.filter(item => item.id !== menuId) });
            },
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
            diningType: "DINE_IN",
            setDiningType: (type) => set({ diningType: type }),
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

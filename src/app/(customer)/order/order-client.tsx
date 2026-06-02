"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useCart, CartItem, getOptionsHash } from "@/hooks/use-cart";
import { useSnap } from "@/hooks/use-snap";
import { useMenuFilter } from "@/hooks/use-menu-filter";
import { useRealtimeMenuUpdates } from "@/hooks/use-realtime-menu-updates";
import { useCustomerOrderSession } from "@/hooks/use-customer-order-session";
import { useCustomerCheckout } from "@/hooks/use-customer-checkout";
import { MenuGrid } from "@/components/customer/menu-grid";
import { CustomerHeader } from "@/components/customer/customer-header";
import { FloatingCartButton } from "@/components/customer/floating-cart-button";
import type { Menu } from "@/types/menu";

const ItemModal = dynamic(() => import("@/components/customer/item-modal").then(mod => mod.ItemModal), { ssr: false });
const CartSheet = dynamic(() => import("@/components/customer/cart-sheet").then(mod => mod.CartSheet), { ssr: false });
const TrackingSheet = dynamic(() => import("@/components/customer/tracking-sheet").then(mod => mod.TrackingSheet), { ssr: false });

interface OrderClientProps {
    initialMenus?: Menu[];
    table: {
        id: string;
        tableNumber: number;
        qrCode: string;
    };
}

export function OrderClient({ initialMenus = [], table }: OrderClientProps) {
    const [menus, setMenus] = useState<Menu[]>(initialMenus);
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);
    const [editItemHash, setEditItemHash] = useState<string | null>(null);
    const [hasMounted, setHasMounted] = useState(false);

    const items = useCart((state) => state.items);
    const tableId = useCart((state) => state.tableId);
    const setTableId = useCart((state) => state.setTableId);
    const clearCart = useCart((state) => state.clearCart);
    const getTotal = useCart((state) => state.getTotal);
    const setActiveOrderCode = useCart((state) => state.setActiveOrderCode);
    const activeOrderCode = useCart((state) => state.activeOrderCode);
    const hasHydrated = useCart((state) => state.hasHydrated);
    const updateItemPrices = useCart((state) => state.updateItemPrices);
    const removeItemsByMenuId = useCart((state) => state.removeItemsByMenuId);
    const diningType = useCart((state) => state.diningType);
    const setOrderAccessToken = useCart((state) => state.setOrderAccessToken);

    const { categories, filteredMenus } = useMenuFilter(menus, activeCategory, searchQuery);
    const { snapPay } = useSnap();
    const itemCount = (hasMounted && hasHydrated)
        ? items.reduce((count, item) => count + item.quantity, 0)
        : 0;

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHasMounted(true);
    }, []);

    const updateMenu = useCallback((updater: (menus: Menu[]) => Menu[]) => {
        setMenus(updater);
    }, []);

    useRealtimeMenuUpdates({
        updateMenu,
        updateItemPrices,
        removeItemsByMenuId,
    });

    useCustomerOrderSession({
        tableId: table.id,
        currentTableId: tableId,
        hasHydrated,
        activeOrderCode,
        setTableId,
        clearCart,
        setActiveOrderCode,
        setOrderAccessToken,
    });

    const closeCart = useCallback(() => setIsCartOpen(false), []);

    const { isSubmitting, handleCheckout } = useCustomerCheckout({
        tableId: table.id,
        items,
        diningType,
        snapPay,
        clearCart,
        updateItemPrices,
        removeItemsByMenuId,
        setActiveOrderCode,
        setOrderAccessToken,
        onPaymentStart: closeCart,
        onOrderCreated: closeCart,
    });

    const handleSelectItem = (menu: Menu) => {
        setSelectedMenu(menu);
        setIsItemModalOpen(true);
    };

    const handleEditItem = (item: CartItem) => {
        const menuToEdit = menus.find(m => m.id === item.id);
        if (!menuToEdit) return;

        setEditingItem(item);
        setEditItemHash(getOptionsHash(item.selectedOptions));
        setSelectedMenu(menuToEdit);
        setIsCartOpen(false);
        setIsItemModalOpen(true);
    };

    const handleCloseItemModal = () => {
        setIsItemModalOpen(false);
        setSelectedMenu(null);
        setEditingItem(null);
        setEditItemHash(null);
        setIsCartOpen(true);
    };

    return (
        <div className="min-h-screen">
            <CustomerHeader
                tableNumber={table.tableNumber}
                itemCount={itemCount}
                onOpenCart={() => setIsCartOpen(true)}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
            />

            <div className={hasMounted && itemCount > 0 ? "pb-[88px]" : "pb-0"}>
                <MenuGrid
                    menus={filteredMenus}
                    allMenus={menus}
                    searchQuery={searchQuery}
                    activeCategory={activeCategory}
                    isLoading={false}
                    onSelectItem={handleSelectItem}
                />
            </div>

            {itemCount > 0 && (
                <FloatingCartButton
                    total={getTotal()}
                    onClick={() => setIsCartOpen(true)}
                />
            )}

            <ItemModal
                key={`${selectedMenu?.id ?? "empty"}-${editItemHash ?? "new"}`}
                menu={selectedMenu}
                isOpen={isItemModalOpen}
                onClose={editingItem ? handleCloseItemModal : () => setIsItemModalOpen(false)}
                initialCartItem={editingItem}
                editItemHash={editItemHash}
            />

            <CartSheet
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                onCheckout={handleCheckout}
                isSubmitting={isSubmitting}
                allMenus={menus}
                onSelectItem={handleSelectItem}
                onEditItem={handleEditItem}
            />

            <TrackingSheet />
        </div>
    );
}

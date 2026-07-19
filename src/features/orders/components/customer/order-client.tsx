"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useCart, CartItem } from "@/features/orders/hooks/use-cart";
import { useMenuFilter } from "@/features/menus/hooks/use-menu-filter";
import { useRealtimeMenuUpdates } from "@/features/menus/hooks/use-realtime-menu-updates";
import { useCustomerOrderSession } from "@/features/orders/hooks/use-customer-order-session";
import { useCustomerCheckout } from "@/features/orders/hooks/use-customer-checkout";
import { useDokuCheckout } from "@/features/orders/hooks/use-doku-checkout";
import { MenuGrid } from "@/features/menus/components/customer/menu-grid";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/shared/client/api-client";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { CustomerHeader } from "@/features/menus/components/customer/customer-header";
import { FloatingCartButton } from "@/features/orders/components/customer/floating-cart-button";
import { ChevronDown } from "lucide-react";
import type { Menu } from "@/features/menus/types";

const ItemModal = dynamic(() => import("@/features/orders/components/customer/item-modal").then(mod => mod.ItemModal), { ssr: false });
const CartSheet = dynamic(() => import("@/features/orders/components/customer/cart-sheet").then(mod => mod.CartSheet), { ssr: false });
const TrackingSheet = dynamic(() => import("@/features/orders/components/customer/tracking-sheet").then(mod => mod.TrackingSheet), { ssr: false });

interface MenuPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

interface MenusResponse {
    menus: Menu[];
    pagination: MenuPagination;
}

interface OrderClientProps {
    initialMenus?: Menu[];
    initialPagination?: MenuPagination | null;
    table: {
        id: string;
        tableNumber: number;
        qrCode: string;
    };
}

const CUSTOMER_MENU_LIMIT = 20;

export function OrderClient({ initialMenus = [], initialPagination = null, table }: OrderClientProps) {
    const [menus, setMenus] = useState<Menu[]>(initialMenus);
    const [pagination, setPagination] = useState<MenuPagination | null>(initialPagination);
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [isLoadingMenus, setIsLoadingMenus] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);
    const [editItemHash, setEditItemHash] = useState<string | null>(null);
    const [hasMounted, setHasMounted] = useState(false);
    const didSkipInitialMenuFetch = useRef(false);

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

    const { categories, filteredMenus } = useMenuFilter(menus, activeCategory, debouncedSearchQuery);
    const { openDokuCheckout } = useDokuCheckout();
    const itemCount = (hasMounted && hasHydrated)
        ? items.reduce((count, item) => count + item.quantity, 0)
        : 0;

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const menuQueryParams = useMemo(() => {
        const params = new URLSearchParams({
            onlyAvailable: "true",
            page: "1",
            limit: String(CUSTOMER_MENU_LIMIT),
        });

        const query = debouncedSearchQuery.trim();
        if (query) params.set("q", query);
        if (activeCategory !== "ALL") params.set("category", activeCategory);

        return params;
    }, [activeCategory, debouncedSearchQuery]);

    useEffect(() => {
        if (!didSkipInitialMenuFetch.current) {
            didSkipInitialMenuFetch.current = true;
            return;
        }

        let isCancelled = false;

        async function fetchMenus() {
            setIsLoadingMenus(true);
            try {
                const data = await apiFetch<MenusResponse>(`/api/menus?${menuQueryParams.toString()}`, { silent: true });
                if (isCancelled) return;
                setMenus(data.menus);
                setPagination(data.pagination);
            } finally {
                if (!isCancelled) setIsLoadingMenus(false);
            }
        }

        fetchMenus();

        return () => {
            isCancelled = true;
        };
    }, [menuQueryParams]);

    const updateMenu = useCallback((updater: (menus: Menu[]) => Menu[]) => {
        setMenus(updater);
    }, []);

    const handleCategoryChange = useCallback((category: string) => {
        setActiveCategory(category);
    }, []);

    const handleLoadMore = useCallback(async () => {
        if (!pagination?.hasNextPage || isLoadingMore) return;

        const params = new URLSearchParams(menuQueryParams);
        params.set("page", String(pagination.page + 1));

        setIsLoadingMore(true);
        try {
            const data = await apiFetch<MenusResponse>(`/api/menus?${params.toString()}`, { silent: true });
            setMenus((currentMenus) => [...currentMenus, ...data.menus]);
            setPagination(data.pagination);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, menuQueryParams, pagination]);

    useRealtimeMenuUpdates({
        updateMenu,
        updateItemPrices,
        removeItemsByMenuId,
    });

    useCustomerOrderSession({
        tableId: table.id,
        tableQrCode: table.qrCode,
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
        clearCart,
        updateItemPrices,
        removeItemsByMenuId,
        setActiveOrderCode,
        setOrderAccessToken,
        onPaymentStart: closeCart,
        openDokuCheckout,
    });

    const handleSelectItem = (menu: Menu) => {
        setSelectedMenu(menu);
        setIsItemModalOpen(true);
    };

    const handleEditItem = (item: CartItem) => {
        const menuToEdit = menus.find(m => m.id === item.id);
        if (!menuToEdit) return;

        setEditingItem(item);
        setEditItemHash(item.lineId);
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
                onCategoryChange={handleCategoryChange}
            />

            <div className={hasMounted && itemCount > 0 ? "pb-[88px]" : "pb-0"}>
                <MenuGrid
                    menus={filteredMenus}
                    allMenus={menus}
                    searchQuery={searchQuery}
                    activeCategory={activeCategory}
                    isLoading={isLoadingMenus}
                    onSelectItem={handleSelectItem}
                />

                {pagination?.hasNextPage && (
                    <div className="px-5 pb-10 pt-2">
                        <Button
                            variant="outline"
                            className="h-12 w-full rounded-2xl border-white/10 bg-zinc-900/70 text-white hover:bg-zinc-800 hover:text-primary hover:border-primary/30 font-black text-xs uppercase tracking-widest shadow-[0_10px_30px_rgba(0,0,0,0.25)] active:scale-[0.98] transition-all disabled:opacity-60"
                            onClick={handleLoadMore}
                            disabled={isLoadingMore || isLoadingMenus}
                        >
                            {isLoadingMore ? "Memuat..." : "Lihat menu lainnya"}
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}
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

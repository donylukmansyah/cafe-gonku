import { useEffect } from "react";
import type { Menu } from "@/features/menus/types";
import { REALTIME_CHANNELS } from "@/shared/realtime-channels";

type MenuUpdatePayload = {
  menuId?: string;
  isAvailable?: boolean;
  fullMenu?: Menu;
};

export function useRealtimeMenuUpdates({
  updateMenu,
  updateItemPrices,
  removeItemsByMenuId,
}: {
  updateMenu: (updater: (menus: Menu[]) => Menu[]) => void;
  updateItemPrices: (updates: { menuId: string; newPrice: number; optionChanges?: { valueId: string; newAdjust: number }[] }[]) => void;
  removeItemsByMenuId: (menuId: string) => void;
}) {
  useEffect(() => {
    const channel = import("@/shared/client/supabase").then(({ supabase }) => {
      return supabase
        .channel(REALTIME_CHANNELS.menuUpdates)
        .on("broadcast", { event: "menu-update" }, (payload) => {
          const { menuId, isAvailable, fullMenu } = payload.payload as MenuUpdatePayload;

          if (fullMenu) {
            updateMenu((prev) =>
              prev.map((menu) =>
                menu.id === fullMenu.id ? { ...menu, ...fullMenu } : menu,
              ),
            );

            const optionChanges = (fullMenu.menuOptions ?? []).flatMap((opt) =>
              (opt.values ?? []).map((val) => ({
                valueId: val.id,
                newAdjust: val.priceAdjust,
              })),
            );

            updateItemPrices([
              {
                menuId: fullMenu.id,
                newPrice: fullMenu.price,
                optionChanges,
              },
            ]);

            if (!fullMenu.isActive) {
              removeItemsByMenuId(fullMenu.id);
            }
            return;
          }

          if (menuId) {
            updateMenu((prev) =>
              prev.map((menu) =>
                menu.id === menuId ? { ...menu, isAvailable: Boolean(isAvailable) } : menu,
              ),
            );

            if (!isAvailable) {
              removeItemsByMenuId(menuId);
            }
          }
        })
        .subscribe();
    });

    return () => {
      channel.then((c) => {
        import("@/shared/client/supabase").then(({ supabase }) => {
          supabase.removeChannel(c);
        });
      });
    };
  }, [removeItemsByMenuId, updateItemPrices, updateMenu]);
}

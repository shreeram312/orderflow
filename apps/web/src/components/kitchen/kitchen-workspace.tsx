"use client";

import { useState } from "react";

import { useKitchenMenu } from "@/hooks/use-kitchen";
import { useKitchenOrders } from "@/hooks/use-kitchen-orders";
import type { KitchenOrder, MenuItem } from "@/lib/api";
import { MenuTable } from "./menu-table";
import { OrdersBoard } from "./orders-board";

type Tab = "orders" | "menu";

/**
 * Two jobs, two tabs. Orders is where staff live during service; Menu is the
 * occasional visit. Both get the full width rather than fighting for a
 * sidebar.
 */
export function KitchenWorkspace({
  initialOrders,
  initialMenu,
}: {
  initialOrders: KitchenOrder[];
  initialMenu: MenuItem[];
}) {
  const [tab, setTab] = useState<Tab>("orders");
  const { data: orders = initialOrders } = useKitchenOrders(initialOrders);
  const { data: menu = initialMenu } = useKitchenMenu(initialMenu);

  const live = orders.length;
  const listed = menu.filter((item) => item.status !== "ARCHIVED").length;

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="bg-muted inline-flex rounded-lg p-1" role="tablist" aria-label="Kitchen sections">
          <TabButton active={tab === "orders"} onClick={() => setTab("orders")} count={live}>
            Orders
          </TabButton>
          <TabButton active={tab === "menu"} onClick={() => setTab("menu")} count={listed}>
            Menu
          </TabButton>
        </div>
      </div>

      {tab === "orders" ? <OrdersBoard orders={orders} /> : <MenuTable items={menu} />}
    </main>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex h-8 items-center gap-2 rounded-md px-3.5 text-sm font-medium transition-colors ${
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      <span
        className={`tabular rounded px-1.5 text-[11px] ${
          active ? "bg-foreground text-background" : "bg-background/70 text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

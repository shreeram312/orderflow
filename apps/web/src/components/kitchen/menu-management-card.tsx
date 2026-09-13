"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";

import { useKitchenMenu } from "@/hooks/use-kitchen";
import type { MenuItem } from "@/lib/api";
import { ManageMenuSheet } from "./manage-menu-sheet";
import { MenuItemActions } from "./menu-item-actions";
import { StatusBadge, Thumb } from "./menu-item-row";
import { CLOSED, type MenuSheetState } from "./menu-sheet-state";

/** Compact preview in the sidebar. Full management happens in the slide sheet. */
export function MenuManagementCard({ initial }: { initial: MenuItem[] }) {
  const { data: items = initial } = useKitchenMenu(initial);
  const [sheet, setSheet] = useState<MenuSheetState>(CLOSED);

  const listed = items.filter((i) => i.status !== "ARCHIVED");
  const preview = listed.slice(0, 4);

  return (
    <section className="bg-card ring-border/60 rounded-xl p-5 shadow-sm ring-1">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Menu Management</h2>
        <Button type="button" size="sm" onClick={() => setSheet({ open: true, view: "create" })}>
          <Plus />
          Add Item
        </Button>
      </div>

      {preview.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">No menu items yet.</p>
      ) : (
        <ul className="mt-3 grid gap-1">
          {preview.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-1">
              <Thumb item={item} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{item.name}</p>
                <p className="text-muted-foreground text-[11px]">₹{item.price}</p>
              </div>
              <StatusBadge item={item} />
              <MenuItemActions
                item={item}
                onEdit={(target) => setSheet({ open: true, view: "edit", item: target })}
              />
            </li>
          ))}
        </ul>
      )}

      {listed.length > preview.length ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => setSheet({ open: true, view: "list" })}
          className="mt-1 h-auto justify-start p-0"
        >
          View all {listed.length} items
        </Button>
      ) : null}

      <ManageMenuSheet state={sheet} onStateChange={setSheet} />
    </section>
  );
}

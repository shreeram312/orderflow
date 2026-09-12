"use client";

import { Settings } from "lucide-react";
import { useState } from "react";

import { Badge } from "@my-better-t-app/ui/components/badge";
import { Button } from "@my-better-t-app/ui/components/button";

import { useKitchenMenu } from "@/hooks/use-kitchen";
import type { MenuItem } from "@/lib/api";
import { ManageMenuSheet } from "./manage-menu-sheet";
import { Thumb } from "./menu-item-row";

const STATUS_VARIANT = { ACTIVE: "success", PAUSED: "warning", ARCHIVED: "muted" } as const;

/** Compact preview in the sidebar. Full management happens in the slide sheet. */
export function MenuManagementCard({ initial }: { initial: MenuItem[] }) {
  const { data: items = initial } = useKitchenMenu(initial);
  const [sheetOpen, setSheetOpen] = useState(false);

  const listed = items.filter((i) => i.status !== "ARCHIVED");
  const preview = listed.slice(0, 4);

  return (
    <section className="bg-card ring-border/60 rounded-xl p-5 shadow-sm ring-1">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Menu Management</h2>
        <Button type="button" variant="link" size="sm" onClick={() => setSheetOpen(true)} className="h-auto p-0">
          View All
        </Button>
      </div>

      {preview.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">No menu items yet.</p>
      ) : (
        <ul className="mt-3 grid gap-2.5">
          {preview.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <Thumb item={item} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{item.name}</p>
                <p className="text-muted-foreground text-[11px]">₹{item.price}</p>
              </div>
              <Badge variant={STATUS_VARIANT[item.status]}>
                {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {listed.length > preview.length ? (
        <p className="text-muted-foreground mt-2.5 text-[11px]">
          +{listed.length - preview.length} more
        </p>
      ) : null}

      <Button type="button" variant="outline" onClick={() => setSheetOpen(true)} className="mt-4 w-full">
        <Settings />
        Manage Menu
      </Button>

      <ManageMenuSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </section>
  );
}

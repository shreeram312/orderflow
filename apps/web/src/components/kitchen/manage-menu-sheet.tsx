"use client";

import { ArrowLeft, Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@my-better-t-app/ui/components/sheet";
import { useResponsiveSheetSide } from "@my-better-t-app/ui/hooks/use-responsive-sheet-side";

import { useKitchenMenu } from "@/hooks/use-kitchen";
import type { MenuItem } from "@/lib/api";
import { MenuItemForm } from "./menu-item-form";
import { MenuItemRow } from "./menu-item-row";

type Mode = { view: "list" } | { view: "create" } | { view: "edit"; item: MenuItem };

export function ManageMenuSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: items = [] } = useKitchenMenu();
  const { sheetSide } = useResponsiveSheetSide();
  const [mode, setMode] = useState<Mode>({ view: "list" });
  const [showArchived, setShowArchived] = useState(false);

  const visible = showArchived ? items : items.filter((i) => i.status !== "ARCHIVED");
  const activeCount = items.filter((i) => i.status === "ACTIVE").length;
  const pausedCount = items.filter((i) => i.status === "PAUSED").length;

  const title =
    mode.view === "create"
      ? "Add menu item"
      : mode.view === "edit"
        ? `Edit ${mode.item.name}`
        : "Manage Menu";

  function close(next: boolean) {
    onOpenChange(next);
    // Always reopen on the list, never mid-edit.
    if (!next) setMode({ view: "list" });
  }

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent
        // Remount on side change so it does not animate between two different
        // transforms when the viewport crosses the md breakpoint.
        key={sheetSide}
        side={sheetSide}
        className={
          sheetSide === "bottom"
            ? "flex max-h-[90vh] flex-col overflow-hidden rounded-t-xl p-0"
            : "flex flex-col overflow-hidden p-0 sm:max-w-xl"
        }
        closeButton={null}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>

        <div className="border-border flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            {mode.view !== "list" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMode({ view: "list" })}
                className="h-8 w-8 shrink-0"
                aria-label="Back to menu list"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{title}</p>
              {mode.view === "list" ? (
                <p className="text-muted-foreground text-xs">
                  {activeCount} active · {pausedCount} paused
                </p>
              ) : null}
            </div>
          </div>

          <SheetClose asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </SheetClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {mode.view === "list" ? (
            visible.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">
                No menu items yet. Add your first one to get started.
              </p>
            ) : (
              <ul className="divide-border/60 ring-border/60 divide-y rounded-lg ring-1">
                {visible.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    onEdit={(target) => setMode({ view: "edit", item: target })}
                  />
                ))}
              </ul>
            )
          ) : (
            <MenuItemForm
              item={mode.view === "edit" ? mode.item : undefined}
              onDone={() => setMode({ view: "list" })}
            />
          )}
        </div>

        {mode.view === "list" ? (
          <div className="border-border bg-muted/30 flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Hide archived" : "Show archived"}
            </Button>
            <Button type="button" size="sm" onClick={() => setMode({ view: "create" })}>
              <Plus />
              Add Item
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

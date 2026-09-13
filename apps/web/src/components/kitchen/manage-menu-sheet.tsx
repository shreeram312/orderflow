"use client";

import { ArrowLeft, Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@my-better-t-app/ui/components/sheet";
import { useResponsiveSheetSide } from "@my-better-t-app/ui/hooks/use-responsive-sheet-side";

import { useKitchenMenu } from "@/hooks/use-kitchen";
import { CLOSED, type MenuSheetState } from "./menu-sheet-state";
import { MenuItemForm } from "./menu-item-form";
import { MenuItemRow } from "./menu-item-row";

export function ManageMenuSheet({
  state,
  onStateChange,
}: {
  state: MenuSheetState;
  onStateChange: (next: MenuSheetState) => void;
}) {
  const { data: items = [] } = useKitchenMenu();
  const { sheetSide } = useResponsiveSheetSide();
  const [showArchived, setShowArchived] = useState(false);

  const view = state.open ? state.view : "list";
  const visible = showArchived ? items : items.filter((i) => i.status !== "ARCHIVED");
  const activeCount = items.filter((i) => i.status === "ACTIVE").length;
  const pausedCount = items.filter((i) => i.status === "PAUSED").length;

  const title =
    state.open && state.view === "create"
      ? "Add menu item"
      : state.open && state.view === "edit"
        ? `Edit ${state.item.name}`
        : "Manage Menu";

  return (
    <Sheet open={state.open} onOpenChange={(next) => onStateChange(next ? { open: true, view: "list" } : CLOSED)}>
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
            {view !== "list" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onStateChange({ open: true, view: "list" })}
                className="h-8 w-8 shrink-0"
                aria-label="Back to menu list"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{title}</p>
              {view === "list" ? (
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
          {view === "list" ? (
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
                    onEdit={(target) => onStateChange({ open: true, view: "edit", item: target })}
                  />
                ))}
              </ul>
            )
          ) : (
            <MenuItemForm
              item={state.open && state.view === "edit" ? state.item : undefined}
              onDone={() => onStateChange({ open: true, view: "list" })}
            />
          )}
        </div>

        {view === "list" ? (
          <div className="border-border bg-muted/30 flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Hide archived" : "Show archived"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onStateChange({ open: true, view: "create" })}
            >
              <Plus />
              Add Item
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

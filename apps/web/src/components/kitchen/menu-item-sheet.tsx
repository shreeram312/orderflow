"use client";

import { X } from "lucide-react";

import { Button } from "@my-better-t-app/ui/components/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@my-better-t-app/ui/components/sheet";
import { useResponsiveSheetSide } from "@my-better-t-app/ui/hooks/use-responsive-sheet-side";

import type { MenuItem } from "@/lib/api";
import { MenuItemForm } from "./menu-item-form";

export type MenuSheetState =
  | { open: false }
  | { open: true; view: "create" }
  | { open: true; view: "edit"; item: MenuItem };

/** Add / edit a dish. A side panel on desktop, a bottom sheet on phones. */
export function MenuItemSheet({
  state,
  onStateChange,
}: {
  state: MenuSheetState;
  onStateChange: (next: MenuSheetState) => void;
}) {
  const { sheetSide } = useResponsiveSheetSide();
  const item = state.open && state.view === "edit" ? state.item : undefined;
  const close = () => onStateChange({ open: false });

  return (
    <Sheet open={state.open} onOpenChange={(open) => (open ? null : close())}>
      <SheetContent
        // Remount on side change so it does not animate between two different
        // transforms when the viewport crosses the md breakpoint.
        key={sheetSide}
        side={sheetSide}
        closeButton={null}
        className={
          sheetSide === "bottom"
            ? "flex max-h-[92vh] flex-col overflow-hidden rounded-t-2xl p-0"
            : "flex flex-col overflow-hidden p-0 sm:max-w-md"
        }
      >
        <SheetTitle className="sr-only">{item ? `Edit ${item.name}` : "Add dish"}</SheetTitle>

        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{item ? item.name : "Add a dish"}</p>
            <p className="text-muted-foreground text-[13px]">
              {item ? "Changes show on the customer menu immediately." : "It goes live as soon as you save."}
            </p>
          </div>
          <SheetClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
              <X />
            </Button>
          </SheetClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          {/* Keyed so switching from one dish to another resets the fields. */}
          <MenuItemForm key={item?.id ?? "new"} item={item} onDone={close} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

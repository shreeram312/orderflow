import type { MenuItem } from "@/lib/api";

/**
 * Which view the manage-menu sheet is showing. Lifted out of the sheet so the
 * sidebar card can open it straight into the form — "Add Item" should not make
 * you land on a list and click again.
 */
export type MenuSheetState =
  | { open: false }
  | { open: true; view: "list" }
  | { open: true; view: "create" }
  | { open: true; view: "edit"; item: MenuItem };

export const CLOSED: MenuSheetState = { open: false };

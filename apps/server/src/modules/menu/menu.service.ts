import type { MenuCategory, MenuItemStatus } from "@my-better-t-app/db";

import { notFound } from "../../lib/http-error";
import { getDb } from "../../services";
import type { CreateMenuItemInput, ListMenuQuery, UpdateMenuItemInput } from "./menu.schemas";

/**
 * Prisma returns Decimal objects for money. They serialise to JSON as strings,
 * which quietly breaks arithmetic on the client, so every read converts once
 * here and nowhere else.
 */
type MenuItemRow = {
  id: string;
  name: string;
  description: string | null;
  price: { toString(): string };
  category: MenuCategory;
  status: MenuItemStatus;
  isVeg: boolean;
  imageUrl: string | null;
  prepTimeMinutes: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicMenuItem = Omit<MenuItemRow, "price"> & { price: number };

function toPublic(row: MenuItemRow): PublicMenuItem {
  return { ...row, price: Number(row.price.toString()) };
}

/** Kitchen view: everything, archived hidden unless asked for. */
export async function listForKitchen(query: ListMenuQuery): Promise<PublicMenuItem[]> {
  const rows = await getDb().menuItem.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status || query.includeArchived ? {} : { status: { not: "ARCHIVED" } }),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return rows.map(toPublic);
}

/** Customer view: only what can actually be ordered right now. */
export async function listForCustomers(): Promise<PublicMenuItem[]> {
  const rows = await getDb().menuItem.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return rows.map(toPublic);
}

export async function getById(id: string): Promise<PublicMenuItem> {
  const row = await getDb().menuItem.findUnique({ where: { id } });
  if (!row) throw notFound("MENU_ITEM_NOT_FOUND", "That menu item does not exist");

  return toPublic(row);
}

export async function create(input: CreateMenuItemInput): Promise<PublicMenuItem> {
  const row = await getDb().menuItem.create({ data: input });
  return toPublic(row);
}

export async function update(id: string, input: UpdateMenuItemInput): Promise<PublicMenuItem> {
  // updateMany rather than update so a missing row is a 404 we control, not a
  // Prisma exception surfacing as a 500.
  const { count } = await getDb().menuItem.updateMany({ where: { id }, data: input });
  if (count === 0) throw notFound("MENU_ITEM_NOT_FOUND", "That menu item does not exist");

  return getById(id);
}

/**
 * Soft delete. Hard-deleting would break the foreign key that order_items will
 * hold in Phase 4 and silently rewrite the contents of historical orders.
 */
export async function archive(id: string): Promise<PublicMenuItem> {
  return update(id, { status: "ARCHIVED" });
}

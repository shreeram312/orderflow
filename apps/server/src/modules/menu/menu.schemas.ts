import { z } from "zod";

const CATEGORIES = ["STARTERS", "MAINS", "SIDES", "DESSERTS", "BEVERAGES"] as const;
const STATUSES = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;

/**
 * Money arrives as a number from JSON but must never become a float in the
 * database. Bounded and rounded to paise here; Prisma stores Decimal(10,2).
 */
const price = z
  .number()
  .positive("Price must be greater than zero")
  .max(100000, "Price looks too high")
  .refine((n) => Number.isFinite(n), "Price must be a number")
  .transform((n) => Math.round(n * 100) / 100);

/** Field shapes with no defaults attached, shared by create and update. */
const fields = {
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(300),
  price,
  category: z.enum(CATEGORIES),
  isVeg: z.boolean(),
  imageUrl: z.string().trim().url("Enter a valid image URL").max(500),
  prepTimeMinutes: z.number().int().min(1).max(180),
  status: z.enum(STATUSES),
};

export const createMenuItemSchema = z.object({
  name: fields.name,
  description: fields.description.optional(),
  price: fields.price,
  category: fields.category.default("MAINS"),
  isVeg: fields.isVeg.default(true),
  imageUrl: fields.imageUrl.optional(),
  prepTimeMinutes: fields.prepTimeMinutes.default(10),
  status: fields.status.default("ACTIVE"),
});

/**
 * Built from the bare field shapes rather than `createMenuItemSchema.partial()`.
 * `.partial()` keeps the `.default()` calls, so an absent key still parses to
 * its default and a PATCH would silently reset every field the caller did not
 * mention — archiving an item, then editing its price, would un-archive it.
 */
export const updateMenuItemSchema = z
  .object({
    name: fields.name.optional(),
    description: fields.description.optional(),
    price: fields.price.optional(),
    category: fields.category.optional(),
    isVeg: fields.isVeg.optional(),
    imageUrl: fields.imageUrl.optional(),
    prepTimeMinutes: fields.prepTimeMinutes.optional(),
    status: fields.status.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update");

export const updateStatusSchema = z.object({
  status: fields.status,
});

export const listMenuQuerySchema = z.object({
  status: fields.status.optional(),
  category: fields.category.optional(),
  /** Kitchen only. Archived items are hidden unless explicitly asked for. */
  includeArchived: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type ListMenuQuery = z.infer<typeof listMenuQuerySchema>;

import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid("Unknown menu item"),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1, "Add at least one item")
    .max(30, "That is too many line items for one order"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

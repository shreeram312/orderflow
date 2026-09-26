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

/**
 * Only the three statuses a human in the kitchen can set. PENDING and CONFIRMED
 * belong to the order worker, and CANCELLED/REJECTED are reached by other
 * flows — none of them are reachable through this endpoint.
 */
export const updateOrderStatusSchema = z.object({
  status: z.enum(["PREPARING", "READY", "COMPLETED"]),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const listKitchenOrdersQuerySchema = z.object({
  /** Omitted means "the live board": CONFIRMED, PREPARING and READY. */
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ])
    .optional(),
});

export type ListKitchenOrdersQuery = z.infer<typeof listKitchenOrdersQuerySchema>;

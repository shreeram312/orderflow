import { z } from "zod";

/**
 * Event contracts — the one place producers and consumers agree on what goes
 * over the wire. Every consumer validates with these schemas before touching
 * the payload, so a producer that changes shape fails loudly at the boundary
 * instead of confusingly three lines into a handler.
 */

export const ROUTING_KEYS = {
  orderCreated: "order.created",
  orderConfirmed: "order.confirmed",
  orderRejected: "order.rejected",
  orderCancelled: "order.cancelled",
  orderPreparing: "order.preparing",
  orderReady: "order.ready",
  orderCompleted: "order.completed",
} as const;

export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

/** The statuses kitchen staff may set by hand, one step at a time. */
export const KITCHEN_STATUSES = ["PREPARING", "READY", "COMPLETED"] as const;
export type KitchenStatus = (typeof KITCHEN_STATUSES)[number];

/** Each kitchen transition gets its own routing key, so a consumer can bind to
 *  just the one it cares about instead of filtering in code. */
export const STATUS_ROUTING_KEYS: Record<KitchenStatus, RoutingKey> = {
  PREPARING: ROUTING_KEYS.orderPreparing,
  READY: ROUTING_KEYS.orderReady,
  COMPLETED: ROUTING_KEYS.orderCompleted,
};

/* ------------------------------------------------------------------ */
/* Envelope                                                            */
/* ------------------------------------------------------------------ */

const envelope = <T extends string, P extends z.ZodType>(eventType: T, payload: P) =>
  z.object({
    /** uuid — the idempotency key every consumer deduplicates on. */
    eventId: z.string().uuid(),
    eventType: z.literal(eventType),
    occurredAt: z.string().datetime(),
    /** Born on the HTTP request, copied into every event downstream of it. */
    correlationId: z.string().min(1),
    orderId: z.string().uuid(),
    payload,
  });

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export const OrderCreatedSchema = envelope(
  "OrderCreated",
  z.object({
    userId: z.string(),
    totalAmount: z.number(),
    items: z.array(
      z.object({ menuItemId: z.string(), name: z.string(), quantity: z.number().int() }),
    ),
  }),
);

export const OrderConfirmedSchema = envelope(
  "OrderConfirmed",
  z.object({ userId: z.string(), totalAmount: z.number() }),
);

export const REJECTION_REASONS = [
  "ITEM_UNAVAILABLE",
  "RESTAURANT_CLOSED",
  "REJECTED_BY_KITCHEN",
] as const;

/** Both refund events carry userId and refundAmount, so the payment worker
 *  never has to reach into the orders table to work out what to give back. */
export const OrderRejectedSchema = envelope(
  "OrderRejected",
  z.object({
    userId: z.string(),
    reason: z.enum(REJECTION_REASONS),
    message: z.string(),
    refundAmount: z.number(),
  }),
);

export const OrderCancelledSchema = envelope(
  "OrderCancelled",
  z.object({
    userId: z.string(),
    cancelledAtStatus: z.enum(["PENDING", "CONFIRMED"]),
    refundAmount: z.number(),
  }),
);

export const OrderStatusChangedSchema = envelope(
  "OrderStatusChanged",
  z.object({
    userId: z.string(),
    status: z.enum(KITCHEN_STATUSES),
    previousStatus: z.string(),
  }),
);

export type OrderCreated = z.infer<typeof OrderCreatedSchema>;
export type OrderConfirmed = z.infer<typeof OrderConfirmedSchema>;
export type OrderRejected = z.infer<typeof OrderRejectedSchema>;
export type OrderCancelled = z.infer<typeof OrderCancelledSchema>;
export type OrderStatusChanged = z.infer<typeof OrderStatusChangedSchema>;

export type OrderEvent =
  | OrderCreated
  | OrderConfirmed
  | OrderRejected
  | OrderCancelled
  | OrderStatusChanged;

/** Any order event, discriminated on eventType. For consumers bound to several keys. */
export const OrderEventSchema = z.discriminatedUnion("eventType", [
  OrderCreatedSchema,
  OrderConfirmedSchema,
  OrderRejectedSchema,
  OrderCancelledSchema,
  OrderStatusChangedSchema,
]);

/**
 * Fills in the envelope. Callers supply only what is specific to the event;
 * the id and timestamp are minted here so nobody forgets one.
 */
export function buildEvent<E extends OrderEvent>(input: {
  eventType: E["eventType"];
  orderId: string;
  correlationId: string;
  payload: E["payload"];
}): E {
  return {
    eventId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    ...input,
  } as E;
}

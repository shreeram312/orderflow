/**
 * Event contracts and the publish seam.
 *
 * Nothing here talks to RabbitMQ yet — `publishOrderCreated` logs and returns.
 * Replace its body with an amqplib publish to `orderflow.events` using the
 * routing key below; the call site in order.service.ts does not need to change.
 *
 * Note where it is called from: *after* the database transaction commits. That
 * gap is real — the commit can succeed and the publish fail, leaving an order
 * no worker will ever pick up. The Outbox Pattern is what closes it.
 */
export const EXCHANGE = "orderflow.events";

export const ROUTING_KEYS = {
  orderCreated: "order.created",
  orderConfirmed: "order.confirmed",
  orderRejected: "order.rejected",
  orderCancelled: "order.cancelled",
} as const;

export type OrderCreatedEvent = {
  /** The idempotency key consumers dedupe on. */
  eventId: string;
  eventType: "OrderCreated";
  occurredAt: string;
  orderId: string;
  payload: {
    userId: string;
    totalAmount: number;
    items: { menuItemId: string; name: string; quantity: number }[];
  };
};

export function buildOrderCreatedEvent(input: {
  orderId: string;
  userId: string;
  totalAmount: number;
  items: { menuItemId: string; name: string; quantity: number }[];
}): OrderCreatedEvent {
  return {
    eventId: crypto.randomUUID(),
    eventType: "OrderCreated",
    occurredAt: new Date().toISOString(),
    orderId: input.orderId,
    payload: {
      userId: input.userId,
      totalAmount: input.totalAmount,
      items: input.items,
    },
  };
}

// TODO(rabbitmq): publish `event` to EXCHANGE with ROUTING_KEYS.orderCreated,
// persistent: true. Until then orders stay PENDING, which is the correct
// visible behaviour for "the worker has not picked it up yet".
export async function publishOrderCreated(event: OrderCreatedEvent): Promise<void> {
  console.info("[event:pending-publish]", ROUTING_KEYS.orderCreated, JSON.stringify(event));
}

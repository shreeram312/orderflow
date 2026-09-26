import { env } from "@/env.server";
import { getChannel } from "@/infra/rabbitmq";

export const ROUTING_KEYS = {
  orderCreated: "order.created",
  orderPreparing: "order.preparing",
  orderReady: "order.ready",
  orderCompleted: "order.completed",
} as const;

/** The statuses kitchen staff may set by hand. */
export type KitchenStatus = "PREPARING" | "READY" | "COMPLETED";

/** Each kitchen transition gets its own routing key, so a consumer can bind to
 *  just the one it cares about instead of filtering in code. */
export const STATUS_ROUTING_KEYS: Record<KitchenStatus, string> = {
  PREPARING: ROUTING_KEYS.orderPreparing,
  READY: ROUTING_KEYS.orderReady,
  COMPLETED: ROUTING_KEYS.orderCompleted,
};

export type OrderCreatedEvent = {
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

export type OrderStatusChangedEvent = {
  eventId: string;
  eventType: "OrderStatusChanged";
  occurredAt: string;
  orderId: string;
  payload: {
    userId: string;
    status: KitchenStatus;
    previousStatus: string;
  };
};

export type OrderEvent = OrderCreatedEvent | OrderStatusChangedEvent;

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

export function buildOrderStatusChangedEvent(input: {
  orderId: string;
  userId: string;
  status: KitchenStatus;
  previousStatus: string;
}): OrderStatusChangedEvent {
  return {
    eventId: crypto.randomUUID(),
    eventType: "OrderStatusChanged",
    occurredAt: new Date().toISOString(),
    orderId: input.orderId,
    payload: {
      userId: input.userId,
      status: input.status,
      previousStatus: input.previousStatus,
    },
  };
}

/**
 * The routing key is a parameter rather than baked in, because the API now
 * emits four different events. The exchange decides who receives them; this
 * function only decides what to call the envelope.
 */
export async function publishOrderEvent(
  routingKey: string,
  event: OrderEvent,
): Promise<void> {
  getChannel().publish(
    env.RABBITMQ_EXCHANGE,
    routingKey,
    Buffer.from(JSON.stringify(event)),
    { persistent: true, contentType: "application/json" },
  );
}

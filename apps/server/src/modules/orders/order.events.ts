import { env } from "@/env.server";
import { getChannel } from "@/infra/rabbitmq";

export const ROUTING_KEYS = {
  orderCreated: "order.created",
} as const;

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

export async function publishOrderEvent(
  event: OrderCreatedEvent,
): Promise<void> {
  getChannel().publish(
    env.RABBITMQ_EXCHANGE,
    ROUTING_KEYS.orderCreated,
    Buffer.from(JSON.stringify(event)),
    { persistent: true, contentType: "application/json" },
  );
}

import {
  type KitchenStatus,
  type OrderCancelled,
  type OrderCreated,
  type OrderRejected,
  type OrderStatusChanged,
  buildEvent,
} from "@my-better-t-app/messaging";

/**
 * The events the API emits. Contracts and routing keys live in
 * @my-better-t-app/messaging so the workers validate against the exact same
 * shapes; this file only fills them in from the API's side.
 *
 * Nothing here publishes. Events are handed to `enqueueEvent` inside the
 * transaction that made the change, and the outbox relay takes it from there.
 */

export function orderCreated(input: {
  orderId: string;
  correlationId: string;
  userId: string;
  totalAmount: number;
  items: OrderCreated["payload"]["items"];
}): OrderCreated {
  const { orderId, correlationId, ...payload } = input;
  return buildEvent<OrderCreated>({ eventType: "OrderCreated", orderId, correlationId, payload });
}

export function orderStatusChanged(input: {
  orderId: string;
  correlationId: string;
  userId: string;
  status: KitchenStatus;
  previousStatus: string;
}): OrderStatusChanged {
  const { orderId, correlationId, ...payload } = input;
  return buildEvent<OrderStatusChanged>({
    eventType: "OrderStatusChanged",
    orderId,
    correlationId,
    payload,
  });
}

export function orderCancelled(input: {
  orderId: string;
  correlationId: string;
  userId: string;
  cancelledAtStatus: OrderCancelled["payload"]["cancelledAtStatus"];
  refundAmount: number;
}): OrderCancelled {
  const { orderId, correlationId, ...payload } = input;
  return buildEvent<OrderCancelled>({ eventType: "OrderCancelled", orderId, correlationId, payload });
}

export function orderRejectedByKitchen(input: {
  orderId: string;
  correlationId: string;
  userId: string;
  message: string;
  refundAmount: number;
}): OrderRejected {
  const { orderId, correlationId, ...rest } = input;
  return buildEvent<OrderRejected>({
    eventType: "OrderRejected",
    orderId,
    correlationId,
    payload: { ...rest, reason: "REJECTED_BY_KITCHEN" },
  });
}

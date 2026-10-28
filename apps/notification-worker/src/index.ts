/**
 * Notification worker — tells the customer when their order moves.
 *
 * Consumes the accept/reject decision from the order worker, plus the status
 * events the API publishes when kitchen staff tap a button:
 *
 *   order.confirmed   "Your order is confirmed"
 *   order.rejected    "Sorry — <reason>"
 *   order.preparing   "Your food is being prepared"
 *   order.ready       "Your order is ready for pickup"
 *
 * Bound to those four keys explicitly rather than the `order.*` wildcard, or
 * this queue would also receive order.created — which the customer is
 * already looking at.
 *
 * The point of this worker is what did NOT change to add it: no producer was
 * touched. order.rejected now lands in two queues — payments refunds, this
 * one notifies — and neither knows the other exists. That is the topic
 * exchange earning its keep.
 *
 * "Sending" is a log line. A real one would call an SMS or push provider here.
 */
import { createPrismaClient } from "@my-better-t-app/db";
import {
  OrderEventSchema,
  type OrderEvent,
  ROUTING_KEYS,
  createLogger,
  onShutdown,
  processOnce,
  startConsumer,
} from "@my-better-t-app/messaging";

const { DATABASE_URL, RABBITMQ_URL, RABBITMQ_EXCHANGE } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check apps/notification-worker/.env");
}
if (!RABBITMQ_URL || !RABBITMQ_EXCHANGE) {
  throw new Error(
    "RABBITMQ_URL / RABBITMQ_EXCHANGE are not set — check apps/notification-worker/.env",
  );
}

const SERVICE = "notification-worker";
const QUEUE = "orderflow.notifications";

const db = createPrismaClient({ DATABASE_URL });
const log = createLogger(SERVICE);

/** What the customer would read. Null means "nothing worth a ping". */
function messageFor(event: OrderEvent): string | null {
  switch (event.eventType) {
    case "OrderConfirmed":
      return "Your order is confirmed";
    case "OrderRejected":
      return `Sorry — ${event.payload.message}. Your wallet has been refunded`;
    case "OrderStatusChanged":
      if (event.payload.status === "PREPARING") return "Your food is being prepared";
      if (event.payload.status === "READY") return "Your order is ready for pickup";
      return null;
    default:
      return null;
  }
}

const consumer = startConsumer({
  url: RABBITMQ_URL,
  exchange: RABBITMQ_EXCHANGE,
  queue: QUEUE,
  routingKeys: [
    ROUTING_KEYS.orderConfirmed,
    ROUTING_KEYS.orderRejected,
    ROUTING_KEYS.orderPreparing,
    ROUTING_KEYS.orderReady,
  ],
  schema: OrderEventSchema,
  log,

  async handle(event, { log }) {
    const text = messageFor(event);
    if (!text) return;

    // Without this, a redelivery texts the customer twice. Harmless for a
    // status column, embarrassing for a phone.
    const outcome = await processOnce(db, SERVICE, event.eventId, async () => {});

    if (outcome.duplicate) {
      log.info("already notified — skipping");
      return;
    }

    log.info("notification sent", { userId: event.payload.userId, text });
  },
});

onShutdown(log, async () => {
  await consumer.stop();
  await db.$disconnect();
});

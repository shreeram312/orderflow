import { createPrismaClient } from "@my-better-t-app/db";
import {
  OrderCreatedSchema,
  type OrderConfirmed,
  type OrderRejected,
  ROUTING_KEYS,
  buildEvent,
  createLogger,
  enqueueEvent,
  onShutdown,
  processOnce,
  startConsumer,
  startOutboxRelay,
} from "@my-better-t-app/messaging";

const { DATABASE_URL, RABBITMQ_URL, RABBITMQ_EXCHANGE } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check apps/order-worker/.env");
}
if (!RABBITMQ_URL || !RABBITMQ_EXCHANGE) {
  throw new Error("RABBITMQ_URL / RABBITMQ_EXCHANGE are not set — check apps/order-worker/.env");
}

const SERVICE = "order-worker";
const QUEUE = "orderflow.orders";

const db = createPrismaClient({ DATABASE_URL });
const log = createLogger(SERVICE);

/**
 * The worker is a producer too. Its follow-up events go through the outbox
 * like the API's do, so "order is CONFIRMED" and "OrderConfirmed exists"
 * commit together. This relay and the API's share the table safely.
 */
const relay = startOutboxRelay({ db, url: RABBITMQ_URL, exchange: RABBITMQ_EXCHANGE, log });

const consumer = startConsumer({
  url: RABBITMQ_URL,
  exchange: RABBITMQ_EXCHANGE,
  queue: QUEUE,
  routingKeys: [ROUTING_KEYS.orderCreated],
  schema: OrderCreatedSchema,
  log,

  async handle(event, { log }) {
    // Read LIVE state — not what the customer's page said when they ordered.
    const [settings, menuItems] = await Promise.all([
      db.restaurantSettings.findUnique({ where: { id: "singleton" } }),
      db.menuItem.findMany({
        where: { id: { in: event.payload.items.map((i) => i.menuItemId) } },
        select: { id: true, name: true, status: true },
      }),
    ]);

    const unavailable = menuItems.find((m) => m.status !== "ACTIVE");

    const rejection: Pick<OrderRejected["payload"], "reason" | "message"> | null =
      !settings?.isOpen
        ? { reason: "RESTAURANT_CLOSED", message: "Restaurant is closed" }
        : unavailable
          ? { reason: "ITEM_UNAVAILABLE", message: `${unavailable.name} is currently unavailable` }
          : null;

    const outcome = await processOnce(db, SERVICE, event.eventId, async (tx) => {
      // The guard: only a PENDING order can be decided. If the customer
      // cancelled first (or the kitchen rejected it), zero rows match and
      // this worker quietly steps aside.
      const { count } = await tx.order.updateMany({
        where: { id: event.orderId, status: "PENDING" },
        data: rejection
          ? { status: "REJECTED", failureReason: rejection.message }
          : { status: "CONFIRMED" },
      });

      if (count === 0) return "skipped" as const;

      const base = { orderId: event.orderId, correlationId: event.correlationId };
      const { userId, totalAmount } = event.payload;

      if (rejection) {
        await enqueueEvent(
          tx,
          ROUTING_KEYS.orderRejected,
          buildEvent<OrderRejected>({
            ...base,
            eventType: "OrderRejected",
            payload: { userId, ...rejection, refundAmount: totalAmount },
          }),
        );
        return "rejected" as const;
      }

      await enqueueEvent(
        tx,
        ROUTING_KEYS.orderConfirmed,
        buildEvent<OrderConfirmed>({
          ...base,
          eventType: "OrderConfirmed",
          payload: { userId, totalAmount },
        }),
      );
      return "confirmed" as const;
    });

    if (outcome.duplicate) {
      log.info("duplicate delivery — already decided");
      return;
    }

    if (outcome.result === "skipped") {
      log.info("skipped — order is no longer PENDING");
      return;
    }

    relay.wake();
    log.info(`order ${outcome.result}`, rejection ? { reason: rejection.message } : {});
  },
});

onShutdown(log, async () => {
  await consumer.stop();
  await relay.stop();
  await db.$disconnect();
});

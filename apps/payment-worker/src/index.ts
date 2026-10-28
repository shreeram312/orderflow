import { createPrismaClient } from "@my-better-t-app/db";
import {
  OrderCancelledSchema,
  OrderRejectedSchema,
  ROUTING_KEYS,
  createLogger,
  onShutdown,
  processOnce,
  startConsumer,
} from "@my-better-t-app/messaging";
import { z } from "zod";

const { DATABASE_URL, RABBITMQ_URL, RABBITMQ_EXCHANGE } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check apps/payment-worker/.env");
}
if (!RABBITMQ_URL || !RABBITMQ_EXCHANGE) {
  throw new Error("RABBITMQ_URL / RABBITMQ_EXCHANGE are not set — check apps/payment-worker/.env");
}

const SERVICE = "payment-worker";
const QUEUE = "orderflow.payments";

const db = createPrismaClient({ DATABASE_URL });
const log = createLogger(SERVICE);

/** Two keys, one queue: both events mean the same thing here — money goes back. */
const RefundEventSchema = z.discriminatedUnion("eventType", [
  OrderRejectedSchema,
  OrderCancelledSchema,
]);

/**
 * The compensating transaction. The debit committed in the API's transaction
 * when the order was placed; this puts the money back, later, in a different
 * process, in a separate transaction.
 *
 * Everything needed is on the event — userId and refundAmount — so this
 * worker never reads the orders table. Events carry what consumers need.
 */
const consumer = startConsumer({
  url: RABBITMQ_URL,
  exchange: RABBITMQ_EXCHANGE,
  queue: QUEUE,
  routingKeys: [ROUTING_KEYS.orderRejected, ROUTING_KEYS.orderCancelled],
  schema: RefundEventSchema,
  log,

  async handle(event, { log }) {
    const { userId, refundAmount } = event.payload;

    // Two guards, belt and braces. processOnce dedupes on eventId; the
    // @@unique([orderId, type]) on wallet_transactions dedupes on the ORDER,
    // which also catches two different events refunding the same order
    // (say, a kitchen reject racing a customer cancel).
    const outcome = await processOnce(db, SERVICE, event.eventId, async (tx) => {
      const wallet = await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: refundAmount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          orderId: event.orderId,
          type: "REFUND",
          amount: refundAmount,
          balanceAfter: wallet.balance,
          note: event.eventType === "OrderCancelled" ? "Order cancelled" : "Order rejected",
        },
      });
    });

    if (outcome.duplicate) {
      log.info("already refunded — skipping");
      return;
    }

    log.info("refunded", { userId, refundAmount });
  },
});

onShutdown(log, async () => {
  await consumer.stop();
  await db.$disconnect();
});

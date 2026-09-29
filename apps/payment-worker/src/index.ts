import amqp from "amqplib";
import { createPrismaClient } from "@my-better-t-app/db";

const DATABASE_URL = process.env.DATABASE_URL;
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check apps/payment-worker/.env");
}
if (!RABBITMQ_URL) {
  throw new Error("RABBITMQ_URL is not set — check apps/payment-worker/.env");
}

const db = createPrismaClient({ DATABASE_URL });

const QUEUE = "orderflow.payments";

// Two keys, one queue: both of these mean the same thing — money goes back.
const ROUTING_KEYS = ["order.rejected", "order.cancelled"] as const;

async function main() {
  const connection = await amqp.connect(RABBITMQ_URL!);
  const channel = await connection.createChannel();

  await channel.assertExchange(RABBITMQ_EXCHANGE!, "topic", { durable: true });
  const { messageCount } = await channel.assertQueue(QUEUE, { durable: true });

  // One bindQueue call per key. Same queue, two rules pointing into it.
  for (const key of ROUTING_KEYS) {
    await channel.bindQueue(QUEUE, RABBITMQ_EXCHANGE!, key);
  }

  // Money work: take one message at a time.
  await channel.prefetch(1);

  console.log(
    `[payment-worker] ready — ${messageCount} message(s) waiting in ${QUEUE}`,
  );

  await channel.consume(
    QUEUE,
    async (message) => {
      if (!message) return;
      try {
        const event = JSON.parse(message.content.toString());
        console.log("[payment-worker] received", {
          orderId: event.orderId,
          reason: event.payload?.reason,
        });

        const order = await db.order.findUnique({
          where: {
            id: event.orderId,
            select: { id: true, userId: true, status: true, totalAmount: true },
          },
        });

        if (!order) {
          console.log("[payment-worker] order not found", event.orderId);
          channel.ack(message);
          return;
        }

        if (order.status !== "REJECTED" && order.status !== "CANCELLED") {
          console.log(
            `[payment-worker] skipped — ${order.id} is ${order.status}`,
          );
          channel.ack(message);
          return;
        }

        const wallet = await db.wallet.findUnique({
          where: { userId: order.userId },
          select: { id: true },
        });

        if (!wallet) {
          console.log("[payment-worker] no wallet for", order.userId);
          channel.ack(message);
          return;
        }

        await db.$transaction(async (tx) => {
          const updated = await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: order.totalAmount } },
          });

          // Throws P2002 if a REFUND row for this order already exists.
          // That rejection is the idempotency guard doing its job.
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              orderId: order.id,
              type: "REFUND",
              amount: order.totalAmount,
              balanceAfter: updated.balance,
              note: "Order refund",
            },
          });
        });

        console.log(
          `[payment-worker] refunded ₹${order.totalAmount} to ${order.userId}`,
        );
        channel.ack(message);
      } catch (error) {
        if (isDuplicate(error)) {
          console.log("[payment-worker] already refunded, skipping");
          channel.ack(message);
          return;
        }

        console.error("[payment-worker] failed", error);
        channel.nack(message, false, false);
      }
    },
    { noAck: false },
  );
}

function isDuplicate(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

void main();

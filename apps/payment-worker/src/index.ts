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
    },
    { noAck: false },
  );
}

void main();

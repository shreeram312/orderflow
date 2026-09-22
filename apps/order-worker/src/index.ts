import amqp from "amqplib";
import { createPrismaClient } from "@my-better-t-app/db";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check apps/order-worker/.env");
}

const db = createPrismaClient({ DATABASE_URL });

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE;

if (!RABBITMQ_URL) {
  throw new Error("RABBITMQ_URL is not set — check apps/order-worker/.env");
}

const QUEUE = "orderflow.orders";
const ROUTING_KEY = "order.created";

async function main() {
  const connection = await amqp.connect(RABBITMQ_URL!);
  const channel = await connection.createChannel();
  console.log("Channel Opened Succesfully");

  await channel.assertExchange(RABBITMQ_EXCHANGE!, "topic", { durable: true });
  const { messageCount } = await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, RABBITMQ_EXCHANGE!, ROUTING_KEY);
  console.log(
    `[order-worker] ready — ${messageCount} message(s) waiting in ${QUEUE}`,
  );

  await channel.consume(
    QUEUE,
    async (message) => {
      if (!message) return;

      try {
        const event = JSON.parse(message.content.toString());

        console.log("[order-worker] received", {
          orderId: event.orderId,
          total: event.payload.totalAmount,
        });

        const order = await db.order.findUnique({
          where: { id: event.orderId },
          select: { id: true, status: true, totalAmount: true },
        });

        console.log("[order-worker] found order", {
          orderId: event.orderId,
          status: order?.status ?? "NOT FOUND",
        });
      } catch (error) {
        console.error("[order-worker] failed", error);

        channel.nack(message, false, false);
      }
    },
    { noAck: false },
  );
}

void main();

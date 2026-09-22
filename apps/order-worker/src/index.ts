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

// The worker is a producer too — these are the events it emits.
const ROUTING_KEYS = {
  orderConfirmed: "order.confirmed",
  orderRejected: "order.rejected",
} as const;

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
          select: {
            id: true,
            status: true,
            totalAmount: true,
            items: { select: { menuItemId: true, name: true } },
          },
        });

        console.log("[order-worker] found order", {
          orderId: event.orderId,
          status: order?.status ?? "NOT FOUND",
        });

        if (!order) {
          console.log("[order-worker] order not found", event.orderId);
          channel.ack(message);
          return;
        }

        // Read LIVE state — not what the customer's page said.
        const settings = await db.restaurantSettings.findUnique({
          where: { id: "singleton" },
        });

        const menuItems = await db.menuItem.findMany({
          where: { id: { in: order.items.map((i) => i.menuItemId) } },
          select: { id: true, name: true, status: true },
        });

        const unavailable = menuItems.filter((m) => m.status !== "ACTIVE");

        let nextStatus: "CONFIRMED" | "REJECTED" = "CONFIRMED";
        let failureReason: string | null = null;

        if (!settings?.isOpen) {
          nextStatus = "REJECTED";
          failureReason = "Restaurant is closed";
        } else if (unavailable.length > 0) {
          nextStatus = "REJECTED";
          failureReason = `${unavailable[0]!.name} is currently unavailable`;
        }

        const updated = await db.order.updateMany({
          where: { id: event.orderId, status: "PENDING" },
          data: { status: nextStatus, failureReason },
        });

        console.log(
          updated.count === 0
            ? `[order-worker] skipped — not PENDING ${event.orderId}`
            : `[order-worker] ${nextStatus} ${event.orderId}${failureReason ? ` — ${failureReason}` : ""}`,
        );

        // Only publish when we actually changed the order. count === 0 means a
        // cancel or a redelivery got here first — publishing anyway would make
        // every downstream worker run a second time.
        if (updated.count > 0) {
          const followUp = {
            eventId: crypto.randomUUID(),
            eventType:
              nextStatus === "CONFIRMED" ? "OrderConfirmed" : "OrderRejected",
            occurredAt: new Date().toISOString(),
            orderId: event.orderId,
            payload: {
              userId: event.payload.userId,
              totalAmount: event.payload.totalAmount,
              ...(failureReason ? { reason: failureReason } : {}),
            },
          };

          const followUpKey =
            nextStatus === "CONFIRMED"
              ? ROUTING_KEYS.orderConfirmed
              : ROUTING_KEYS.orderRejected;

          channel.publish(
            RABBITMQ_EXCHANGE!,
            followUpKey,
            Buffer.from(JSON.stringify(followUp)),
            { persistent: true, contentType: "application/json" },
          );

          console.log("[order-worker] published", followUpKey, event.orderId);
        }

        channel.ack(message);
      } catch (error) {
        console.error("[order-worker] failed", error);

        channel.nack(message, false, false);
      }
    },
    { noAck: false },
  );
}

void main();

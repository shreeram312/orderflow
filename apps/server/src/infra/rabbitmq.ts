import amqp from "amqplib";

import { env } from "../env.server";

// Derived rather than imported: amqplib's `connect` return type changed name
// across versions, so inferring it keeps this compiling either way.
type Connection = Awaited<ReturnType<typeof amqp.connect>>;
type Channel = Awaited<ReturnType<Connection["createChannel"]>>;

let connection: Connection | null = null;
let channelPromise: Promise<Channel> | null = null;

async function createChannel(): Promise<Channel> {
  connection = await amqp.connect(env.RABBITMQ_URL);

  connection.on("error", (error) =>
    console.error("[rabbitmq] connection error", error),
  );
  connection.on("close", () => {
    // Drop the cache so the next publish reconnects instead of using a dead channel.
    connection = null;
    channelPromise = null;
  });

  const channel = await connection.createChannel();

  await channel.assertExchange(env.RABBITMQ_EXCHANGE, "topic", {
    durable: true,
  });

  console.info(
    "[rabbitmq] connected, exchange asserted:",
    env.RABBITMQ_EXCHANGE,
  );
  return channel;
}

/**
 * One connection per process — a TCP socket is expensive, channels multiplexed
 * over it are cheap. The *promise* is cached rather than the channel so two
 * concurrent first calls cannot open two connections.
 */
export function getChannel(): Promise<Channel> {
  channelPromise ??= createChannel();
  return channelPromise;
}

export async function closeBroker(): Promise<void> {
  const current = connection;
  channelPromise = null;
  connection = null;
  await current?.close();
}

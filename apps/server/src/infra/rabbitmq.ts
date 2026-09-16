import amqp, { type Channel } from "amqplib";

import { env } from "../env.server";

let channel: Channel | null = null;

export async function initBroker(): Promise<void> {
  const model = await amqp.connect(env.RABBITMQ_URL);
  channel = await model.createChannel();

  await channel.assertExchange(env.RABBITMQ_EXCHANGE, "topic", {
    durable: true,
  });

  console.info("[rabbitmq] connected");
}

export function getChannel(): Channel {
  if (!channel) throw new Error("Broker not initialised");
  return channel;
}

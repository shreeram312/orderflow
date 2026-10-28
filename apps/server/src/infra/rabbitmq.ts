import { createLogger, startOutboxRelay, type OutboxRelay } from "@my-better-t-app/messaging";

import { env } from "../env.server";
import { getDb } from "../services";

export const log = createLogger("api");

let relay: OutboxRelay | null = null;

/**
 * The API never publishes to RabbitMQ directly any more. Request handlers
 * write events to the outbox table inside their own transaction; this relay
 * drains that table to the broker.
 *
 * A side effect worth noticing: the API now starts, and takes orders, even
 * while RabbitMQ is down. Events queue up in Postgres and go out when the
 * broker comes back.
 */
export function initBroker(): void {
  relay = startOutboxRelay({
    db: getDb(),
    url: env.RABBITMQ_URL,
    exchange: env.RABBITMQ_EXCHANGE,
    log,
  });
}

/** Call after a transaction that enqueued events commits, so they go out now
 *  rather than on the relay's next idle poll. */
export function wakeOutbox(): void {
  relay?.wake();
}

export function isBrokerConnected(): boolean {
  return relay?.isConnected() ?? false;
}

export async function stopBroker(): Promise<void> {
  await relay?.stop();
}

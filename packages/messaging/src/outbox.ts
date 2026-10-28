import type { ConfirmChannel } from "amqplib";
import type { Database } from "@my-better-t-app/db";

import { keepConnected } from "./connection";
import type { OrderEvent, RoutingKey } from "./events";
import { TX_OPTIONS, type Tx } from "./idempotency";
import type { Logger } from "./logger";

/**
 * Records an event to be published, inside the caller's transaction.
 *
 * This is the only way order events leave a process. The order change and its
 * event commit together or not at all — there is no window where the database
 * says CONFIRMED but RabbitMQ never heard about it.
 */
export async function enqueueEvent(tx: Tx, routingKey: RoutingKey, event: OrderEvent) {
  await tx.outboxEvent.create({
    data: {
      eventId: event.eventId,
      eventType: event.eventType,
      routingKey,
      payload: event,
    },
  });
}

export type OutboxRelay = {
  /** Skip the wait and drain now — call after committing an enqueue. */
  wake(): void;
  isConnected(): boolean;
  stop(): Promise<void>;
};

type OutboxRow = { id: string; routing_key: string; payload: unknown; event_id: string };

/**
 * Publishes unpublished outbox rows to RabbitMQ.
 *
 * Delivery is at-least-once, never at-most-once: rows are marked published
 * only after the broker confirms them. If the process dies between the
 * confirm and the UPDATE, the same rows go out again on the next pass — which
 * is fine, because every consumer deduplicates on eventId.
 *
 * `FOR UPDATE SKIP LOCKED` lets several relays (the API and the order worker
 * both run one) drain the same table without publishing a row twice
 * concurrently: each claims a batch the others then skip over.
 */
export function startOutboxRelay(options: {
  db: Database;
  url: string;
  exchange: string;
  log: Logger;
  /** Idle poll interval. Commits in this process call wake() instead of waiting. */
  intervalMs?: number;
  batchSize?: number;
}): OutboxRelay {
  const { db, url, exchange, log, intervalMs = 2_000, batchSize = 50 } = options;

  let channel: ConfirmChannel | null = null;
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;
  let draining: Promise<void> | null = null;
  let wakeRequested = false;

  const connection = keepConnected({
    url,
    log,
    async setup(conn) {
      const ch = await conn.createConfirmChannel();
      await ch.assertExchange(exchange, "topic", { durable: true });
      ch.on("close", () => {
        channel = null;
      });
      channel = ch;
      // Anything enqueued while we were disconnected goes out now.
      relay.wake();
    },
  });

  async function drainOnce(): Promise<number> {
    const ch = channel;
    if (!ch) return 0;

    // Cheap look before the locking transaction. Most polls find nothing, and
    // an empty BEGIN/SELECT/COMMIT every couple of seconds is wasted round
    // trips to a remote database.
    const pending = await db.outboxEvent.findFirst({
      where: { publishedAt: null },
      select: { id: true },
    });
    if (!pending) return 0;

    return db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<OutboxRow[]>`
        SELECT id, event_id, routing_key, payload
        FROM outbox_events
        WHERE published_at IS NULL
        ORDER BY created_at
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      `;

      if (rows.length === 0) return 0;

      for (const row of rows) {
        ch.publish(exchange, row.routing_key, Buffer.from(JSON.stringify(row.payload)), {
          persistent: true,
          contentType: "application/json",
          messageId: row.event_id,
        });
      }

      // Resolves once the broker has every message on disk; rejects if any
      // were refused. Only then is it safe to mark them published.
      await ch.waitForConfirms();

      await tx.outboxEvent.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { publishedAt: new Date(), attempts: { increment: 1 } },
      });

      log.info("outbox published", {
        count: rows.length,
        routingKeys: [...new Set(rows.map((r) => r.routing_key))],
      });

      return rows.length;
    }, TX_OPTIONS);
  }

  async function drain() {
    try {
      // Keep going while full batches come back — there may be more behind them.
      while (!stopped && (await drainOnce()) === batchSize) {}
    } catch (error) {
      // The transaction rolled back, so every row is still unpublished and
      // will be retried on the next pass. Nothing is lost.
      log.error("outbox publish failed — will retry", { err: error });
    }
  }

  function schedule(delay: number) {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(tick, delay);
  }

  function tick() {
    timer = null;
    if (draining) {
      // A pass is already running; make sure another follows it.
      wakeRequested = true;
      return;
    }

    draining = drain().finally(() => {
      draining = null;
      if (wakeRequested) {
        wakeRequested = false;
        schedule(0);
      } else {
        schedule(intervalMs);
      }
    });
  }

  const relay: OutboxRelay = {
    wake: () => schedule(0),
    isConnected: () => connection.isConnected() && channel !== null,
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      await draining;
      await connection.close();
    },
  };

  schedule(intervalMs);
  return relay;
}

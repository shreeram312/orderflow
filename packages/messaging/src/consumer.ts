import type { ConfirmChannel, ConsumeMessage } from "amqplib";
import type { ZodType } from "zod";

import { keepConnected } from "./connection";
import type { Logger } from "./logger";

/**
 * Throw from a handler when retrying cannot possibly help — the input itself
 * is wrong. The message goes straight to the dead-letter queue instead of
 * burning through every retry first.
 */
export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentError";
  }
}

export type HandlerContext = {
  log: Logger;
  /** 1 on first delivery, 2 on the first retry, and so on. */
  attempt: number;
};

export type Consumer = {
  isConnected(): boolean;
  /** Stop taking new messages, let the in-flight one finish, then disconnect. */
  stop(): Promise<void>;
};

/** Header carrying the attempt count across retries. */
const ATTEMPT_HEADER = "x-attempt";

/**
 * Backoff between attempts. One retry queue per step, because RabbitMQ only
 * expires messages from the HEAD of a queue — mixing a 1s and a 15s message in
 * one queue would make the 1s one wait behind the 15s one.
 */
const DEFAULT_RETRY_DELAYS_MS = [1_000, 5_000, 15_000];

export const retryQueueName = (queue: string, step: number) => `${queue}.retry.${step}`;
export const deadLetterQueueName = (queue: string) => `${queue}.dlq`;

/**
 * Declares a work queue plus its retry ladder and dead-letter queue:
 *
 *   orderflow.events --(routing keys)--> orderflow.orders
 *
 *   on failure:   orderflow.orders.retry.1  (TTL 1s)  --expires--> orderflow.orders
 *                 orderflow.orders.retry.2  (TTL 5s)  --expires--> orderflow.orders
 *                 orderflow.orders.retry.3  (TTL 15s) --expires--> orderflow.orders
 *   give up:      orderflow.orders.dlq      (kept for a human to inspect)
 *
 * Expired retries go back through the DEFAULT exchange straight to this one
 * queue, not through orderflow.events. Re-routing through the topic exchange
 * would re-deliver an order.rejected retry to every queue bound to that key —
 * the notification worker would notify twice because payments had a blip.
 */
async function declareTopology(
  channel: ConfirmChannel,
  options: { exchange: string; queue: string; routingKeys: readonly string[]; retryDelaysMs: number[] },
) {
  const { exchange, queue, routingKeys, retryDelaysMs } = options;

  await channel.assertExchange(exchange, "topic", { durable: true });
  await channel.assertQueue(queue, { durable: true });

  for (const key of routingKeys) {
    await channel.bindQueue(queue, exchange, key);
  }

  for (const [index, ttl] of retryDelaysMs.entries()) {
    await channel.assertQueue(retryQueueName(queue, index + 1), {
      durable: true,
      arguments: {
        "x-message-ttl": ttl,
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": queue,
      },
    });
  }

  await channel.assertQueue(deadLetterQueueName(queue), { durable: true });
}

/**
 * Consumes one queue reliably. Everything a worker would otherwise repeat:
 *
 *   - manual ack, prefetch(1)       one message at a time, acked only after success
 *   - schema validation             malformed events are dead-lettered, never retried
 *   - retry with backoff            transient failures go round the retry ladder
 *   - dead-letter queue             after the last retry, or on PermanentError
 *   - reconnect                     broker restarts are survived, topology re-declared
 *   - graceful stop                 SIGTERM finishes the in-flight message first
 *
 * Handlers only describe the work. They should be idempotent — see processOnce.
 */
export function startConsumer<E extends { eventId: string; eventType: string; orderId: string; correlationId: string }>(options: {
  url: string;
  exchange: string;
  queue: string;
  routingKeys: readonly string[];
  schema: ZodType<E>;
  log: Logger;
  handle: (event: E, ctx: HandlerContext) => Promise<void>;
  retryDelaysMs?: number[];
}): Consumer {
  const {
    url,
    exchange,
    queue,
    routingKeys,
    schema,
    handle,
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  } = options;
  const log = options.log.child({ queue });

  let channel: ConfirmChannel | null = null;
  let consumerTag: string | null = null;
  let inFlight: Promise<void> | null = null;
  let stopping = false;

  /** Copies a message to another queue and waits for the broker to accept it. */
  async function forward(
    ch: ConfirmChannel,
    target: string,
    message: ConsumeMessage,
    headers: Record<string, unknown>,
  ) {
    ch.sendToQueue(target, message.content, {
      persistent: true,
      contentType: message.properties.contentType,
      messageId: message.properties.messageId,
      headers: { ...message.properties.headers, ...headers },
    });
    await ch.waitForConfirms();
  }

  async function deadLetter(ch: ConfirmChannel, message: ConsumeMessage, attempt: number, error: unknown) {
    await forward(ch, deadLetterQueueName(queue), message, {
      [ATTEMPT_HEADER]: attempt,
      "x-error": error instanceof Error ? error.message : String(error),
      "x-failed-at": new Date().toISOString(),
    });
  }

  async function handleMessage(ch: ConfirmChannel, message: ConsumeMessage) {
    const attempt = Number(message.properties.headers?.[ATTEMPT_HEADER] ?? 1);

    // 1. Validate. A message that does not parse will never parse, so it is a
    //    poison message: dead-letter it now rather than retrying forever.
    let event: E;
    try {
      event = schema.parse(JSON.parse(message.content.toString()));
    } catch (error) {
      log.error("invalid event — dead-lettered", { err: error, attempt });
      await deadLetter(ch, message, attempt, error);
      ch.ack(message);
      return;
    }

    const eventLog = log.child({
      eventId: event.eventId,
      eventType: event.eventType,
      orderId: event.orderId,
      correlationId: event.correlationId,
      attempt,
    });

    // 2. Do the work. Ack only after it has committed.
    const startedAt = Date.now();
    try {
      await handle(event, { log: eventLog, attempt });
      ch.ack(message);
      eventLog.info("handled", { durationMs: Date.now() - startedAt });
      return;
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      // 3a. Out of retries, or not worth retrying: park it for a human.
      if (error instanceof PermanentError || attempt > retryDelaysMs.length) {
        eventLog.error("giving up — dead-lettered", { err: error, durationMs });
        await deadLetter(ch, message, attempt, error);
        ch.ack(message);
        return;
      }

      // 3b. Transient: send it round the retry ladder. The copy is confirmed
      //     before the original is acked, so a crash in between leaves a
      //     duplicate (handled by idempotency), never a loss.
      const retryQueue = retryQueueName(queue, attempt);
      eventLog.warn("failed — scheduling retry", {
        err: error,
        durationMs,
        retryQueue,
        retryInMs: retryDelaysMs[attempt - 1],
      });
      await forward(ch, retryQueue, message, {
        [ATTEMPT_HEADER]: attempt + 1,
        "x-last-error": error instanceof Error ? error.message : String(error),
      });
      ch.ack(message);
    }
  }

  const connection = keepConnected({
    url,
    log,
    async setup(conn) {
      // A confirm channel, so retry and dead-letter copies are known to be
      // safely on the broker before the original is acked.
      const ch = await conn.createConfirmChannel();
      await declareTopology(ch, { exchange, queue, routingKeys, retryDelaysMs });

      // Without this the broker pushes the whole backlog at once: one worker
      // buffers everything while a second sits idle, and a crash loses the lot
      // back to the queue in one go.
      await ch.prefetch(1);

      ch.on("close", () => {
        channel = null;
        consumerTag = null;
        // A channel can die on its own (e.g. a precondition error) while the
        // connection lives on. Close the connection too so keepConnected
        // rebuilds everything, instead of sitting connected and deaf.
        if (!stopping) void conn.close().catch(() => {});
      });

      const { messageCount } = await ch.checkQueue(queue);

      const reply = await ch.consume(
        queue,
        (message) => {
          if (!message) return;
          inFlight = handleMessage(ch, message)
            .catch((error) => {
              // Only reachable if the channel died mid-message. The broker
              // still holds it unacked and will redeliver it after reconnect.
              log.error("message left unacked", { err: error });
            })
            .finally(() => {
              inFlight = null;
            });
        },
        { noAck: false },
      );

      channel = ch;
      consumerTag = reply.consumerTag;
      log.info("consuming", { routingKeys, waiting: messageCount });
    },
  });

  return {
    isConnected: () => connection.isConnected(),
    async stop() {
      stopping = true;
      log.info("stopping — finishing in-flight message");

      // Tell the broker to stop delivering, then wait out the current message
      // so it is acked rather than abandoned mid-transaction.
      if (channel && consumerTag) {
        await channel.cancel(consumerTag).catch(() => {});
      }
      await inFlight;
      await connection.close();

      log.info("stopped");
    },
  };
}

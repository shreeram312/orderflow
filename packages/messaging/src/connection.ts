import amqp, { type ChannelModel } from "amqplib";

import type { Logger } from "./logger";

export type ManagedConnection = {
  /** True while a connection is open and `setup` has finished on it. */
  isConnected(): boolean;
  /** Stops reconnecting and closes the current connection. */
  close(): Promise<void>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Keeps one AMQP connection alive for the life of the process.
 *
 * `setup` runs on every fresh connection — first boot and every reconnect —
 * and is where callers open channels, declare topology and start consuming.
 * Doing it there, rather than once at startup, is what makes recovery work:
 * channels die with their connection, so they have to be rebuilt each time.
 *
 * Backoff doubles from 1s up to 30s, so a broker that is down for an hour
 * gets a knock every half-minute rather than a few thousand per second.
 */
export function keepConnected(options: {
  url: string;
  log: Logger;
  setup: (connection: ChannelModel) => Promise<void>;
}): ManagedConnection {
  const { url, log, setup } = options;

  let current: ChannelModel | null = null;
  let ready = false;
  let closing = false;

  async function connectLoop() {
    let delay = 1_000;

    while (!closing) {
      let connection: ChannelModel | null = null;

      try {
        connection = await amqp.connect(url);
        current = connection;

        connection.on("error", (error) => {
          // Always followed by "close"; logged here so the cause is visible.
          log.warn("broker connection error", { err: error });
        });

        connection.on("close", () => {
          ready = false;
          current = null;
          if (closing) return;
          log.warn("broker connection lost — reconnecting");
          void connectLoop();
        });

        await setup(connection);
        ready = true;
        log.info("broker connected");
        return;
      } catch (error) {
        ready = false;
        // A half-built connection (setup threw) must not linger. Detach the
        // close listener first, or closing it here would start a second loop.
        connection?.removeAllListeners("close");
        await connection?.close().catch(() => {});
        current = null;

        log.warn("broker unavailable, retrying", { err: error, retryInMs: delay });
        await sleep(delay);
        delay = Math.min(delay * 2, 30_000);
      }
    }
  }

  void connectLoop();

  return {
    isConnected: () => ready,
    async close() {
      closing = true;
      ready = false;
      await current?.close().catch(() => {});
      current = null;
    },
  };
}

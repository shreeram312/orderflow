import type { Logger } from "./logger";

/**
 * Runs `cleanup` once on SIGTERM or SIGINT (Ctrl-C, `docker stop`, tsx watch
 * restarting), then exits. A second signal while cleanup is running forces
 * the exit, so a stuck shutdown never needs `kill -9`.
 */
export function onShutdown(log: Logger, cleanup: () => Promise<void>) {
  let shuttingDown = false;

  const handler = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      log.warn("second signal — forcing exit", { signal });
      process.exit(1);
    }
    shuttingDown = true;
    log.info("shutting down", { signal });

    try {
      await cleanup();
      process.exit(0);
    } catch (error) {
      log.error("unclean shutdown", { err: error });
      process.exit(1);
    }
  };

  process.on("SIGTERM", handler);
  process.on("SIGINT", handler);
}

/**
 * A deliberately tiny structured logger: one JSON object per line.
 *
 * Structured because the whole point is `grep <correlationId>` across four
 * processes and getting one order's life story back in order. `child()` binds
 * fields once — service, queue, eventId — so every later line carries them.
 */

type Fields = Record<string, unknown>;
type Level = "info" | "warn" | "error";

export type Logger = {
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  error(message: string, fields?: Fields): void;
  child(fields: Fields): Logger;
};

/** Errors do not survive JSON.stringify — they serialise as {}. */
function serialise(fields: Fields): Fields {
  const out: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] =
      value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;
  }
  return out;
}

export function createLogger(service: string, bound: Fields = {}): Logger {
  const write = (level: Level, message: string, fields: Fields = {}) => {
    const line = JSON.stringify({
      level,
      time: new Date().toISOString(),
      service,
      ...serialise(bound),
      ...serialise(fields),
      message,
    });

    if (level === "error") console.error(line);
    else console.log(line);
  };

  return {
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
    child: (fields) => createLogger(service, { ...bound, ...fields }),
  };
}

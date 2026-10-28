import type { NextFunction, Request, Response } from "express";

import { log } from "../infra/rabbitmq";

/**
 * Gives every request a correlation id — the thread that ties one customer
 * action to every event and worker log line it causes downstream.
 *
 * An incoming `x-correlation-id` is honoured so a caller (or a test) can pick
 * the id it will grep for; otherwise one is minted. It is echoed back on the
 * response so the browser's network tab shows it too.
 */
export function correlationId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.get("x-correlation-id");
  const id = incoming && incoming.length <= 128 ? incoming : `req-${crypto.randomUUID()}`;

  req.correlationId = id;
  res.setHeader("x-correlation-id", id);

  const startedAt = Date.now();
  res.on("finish", () => {
    log.info("request", {
      correlationId: id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
}

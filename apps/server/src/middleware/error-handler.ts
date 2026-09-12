import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../lib/http-error";

/** Terminal error handler. Must be mounted last, and must take four arguments. */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  // Anything unrecognised is a bug. Log it in full, tell the client nothing —
  // stack traces and driver messages are an information leak.
  console.error("[unhandled]", error);

  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "Something went wrong",
  });
}

import type { Response } from "express";

/**
 * Every successful response has the same shape:
 *   { status: true, message, data }
 *
 * Failures are emitted by the error handler as:
 *   { status: false, error, message, details? }
 *
 * so a client can branch on `status` alone without inspecting HTTP codes.
 */
export type SuccessBody<T> = {
  status: true;
  message: string;
  data: T;
};

export function ok<T>(res: Response, data: T, message = "OK"): void {
  res.status(200).json({ status: true, message, data } satisfies SuccessBody<T>);
}

export function created<T>(res: Response, data: T, message = "Created"): void {
  res.status(201).json({ status: true, message, data } satisfies SuccessBody<T>);
}

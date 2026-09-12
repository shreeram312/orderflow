/** Error codes the frontend switches on. Keep in sync with the README's table. */
export type ErrorCode =
  | "VALIDATION_FAILED"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "INVALID_KITCHEN_CODE"
  | "UNAUTHENTICATED"
  | "FORBIDDEN";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (code: ErrorCode, message: string, details?: unknown) =>
  new HttpError(400, code, message, details);

export const unauthenticated = (message = "You are not signed in") =>
  new HttpError(401, "UNAUTHENTICATED", message);

export const forbidden = (message = "You do not have access to this resource") =>
  new HttpError(403, "FORBIDDEN", message);

export const conflict = (code: ErrorCode, message: string) => new HttpError(409, code, message);

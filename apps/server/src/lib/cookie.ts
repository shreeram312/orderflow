import type { CookieOptions, Response } from "express";

import { env } from "../env.server";

export const SESSION_COOKIE = "orderflow_session";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function options(): CookieOptions {
  const isProd = env.NODE_ENV === "production";

  return {
    httpOnly: true,
    // "lax" is enough while web and API share localhost. A real deployment on
    // two different domains needs sameSite "none" + secure, which requires HTTPS.
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, { ...options(), maxAge: SEVEN_DAYS_MS });
}

export function clearSessionCookie(res: Response): void {
  // Must match the attributes used when setting it, or the browser keeps the old cookie.
  res.clearCookie(SESSION_COOKIE, options());
}

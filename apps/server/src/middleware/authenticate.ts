import type { NextFunction, Request, Response } from "express";

import { SESSION_COOKIE } from "../lib/cookie";
import { unauthenticated } from "../lib/http-error";
import { verifySession } from "../lib/jwt";

/**
 * Verifies the session cookie and attaches the claims to the request.
 * Claims come from the signed token only — never from a header or body a
 * client could set.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];

  if (typeof token !== "string" || token.length === 0) {
    return next(unauthenticated());
  }

  const claims = await verifySession(token);
  if (!claims) return next(unauthenticated("Your session is invalid or has expired"));

  req.user = claims;
  next();
}

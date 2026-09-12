import type { NextFunction, Request, Response } from "express";

import { forbidden, unauthenticated } from "../lib/http-error";
import type { SessionClaims } from "../lib/jwt";

/**
 * Route-level role gate. This is the real enforcement — the frontend's
 * role-based redirects are cosmetic and can be bypassed with curl.
 * Always mount after `authenticate`.
 */
export function requireRole(role: SessionClaims["role"]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthenticated());
    if (req.user.role !== role) return next(forbidden());
    next();
  };
}

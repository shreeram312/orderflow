import type { NextFunction, Request, Response } from "express";

import { clearSessionCookie, setSessionCookie } from "../../lib/cookie";
import { unauthenticated } from "../../lib/http-error";
import { signSession } from "../../lib/jwt";
import { parse } from "../../lib/parse";
import { created, ok } from "../../lib/response";
import * as authService from "./auth.service";
import { customerSignupSchema, kitchenSignupSchema, loginSchema } from "./auth.schemas";
import type { PublicUser } from "./auth.service";

/** Signs a session and sets the cookie. */
async function issueSession(res: Response, user: PublicUser) {
  const token = await signSession({ userId: user.id, role: user.role });
  setSessionCookie(res, token);
}

export async function signupCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(customerSignupSchema, req.body);
    const user = await authService.registerCustomer(input);
    await issueSession(res, user);

    created(res, { user }, "Account created");
  } catch (error) {
    next(error);
  }
}

export async function signupKitchen(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(kitchenSignupSchema, req.body);
    const user = await authService.registerKitchen(input);
    await issueSession(res, user);

    created(res, { user }, "Staff account created");
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(loginSchema, req.body);
    const user = await authService.login(input);
    await issueSession(res, user);

    ok(res, { user }, "Signed in");
  } catch (error) {
    next(error);
  }
}

export function logout(_req: Request, res: Response) {
  clearSessionCookie(res);
  // 200 with an envelope rather than 204, so every response has the same shape.
  ok(res, null, "Signed out");
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw unauthenticated();

    // Read through to the database rather than trusting the token's contents:
    // this is what catches a deleted account still holding a valid cookie.
    const user = await authService.findPublicUser(req.user.userId);
    if (!user) throw unauthenticated("Your account no longer exists");

    ok(res, { user });
  } catch (error) {
    next(error);
  }
}

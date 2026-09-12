import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

import { clearSessionCookie, setSessionCookie } from "../../lib/cookie";
import { badRequest, unauthenticated } from "../../lib/http-error";
import { signSession } from "../../lib/jwt";
import * as authService from "./auth.service";
import { customerSignupSchema, kitchenSignupSchema, loginSchema } from "./auth.schemas";
import type { PublicUser } from "./auth.service";

function parse<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw badRequest(
      "VALIDATION_FAILED",
      "Please check the highlighted fields",
      // Field-keyed messages so the form can render errors inline.
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}

/** Signs a session, sets the cookie, and returns the user. */
async function issueSession(res: Response, user: PublicUser) {
  const token = await signSession({ userId: user.id, role: user.role });
  setSessionCookie(res, token);
  return { user };
}

export async function signupCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(customerSignupSchema, req.body);
    const user = await authService.registerCustomer(input);
    res.status(201).json(await issueSession(res, user));
  } catch (error) {
    next(error);
  }
}

export async function signupKitchen(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(kitchenSignupSchema, req.body);
    const user = await authService.registerKitchen(input);
    res.status(201).json(await issueSession(res, user));
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(loginSchema, req.body);
    const user = await authService.login(input);
    res.status(200).json(await issueSession(res, user));
  } catch (error) {
    next(error);
  }
}

export function logout(_req: Request, res: Response) {
  clearSessionCookie(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw unauthenticated();

    // Read through to the database rather than trusting the token's contents:
    // this is what catches a deleted account still holding a valid cookie.
    const user = await authService.findPublicUser(req.user.userId);
    if (!user) throw unauthenticated("Your account no longer exists");

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

import { SignJWT, jwtVerify } from "jose";

import { env } from "../env.server";

export type SessionClaims = {
  userId: string;
  role: "CUSTOMER" | "KITCHEN";
};

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ALG = "HS256";

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
}

/** Returns null for any invalid, expired, or tampered token. */
export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });

    if (typeof payload.sub !== "string") return null;
    if (payload.role !== "CUSTOMER" && payload.role !== "KITCHEN") return null;

    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

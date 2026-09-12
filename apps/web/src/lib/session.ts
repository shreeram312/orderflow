import { cookies } from "next/headers";

import { ENV } from "@/env";
import type { PublicUser } from "./api";

/**
 * Server-side session read. Used by page and layout guards.
 *
 * Server Components do NOT forward the browser's cookies to `fetch`
 * automatically, so the Cookie header has to be copied across by hand.
 * Forgetting this is the classic Next.js auth bug: the same call works in a
 * client component and silently returns 401 in a server one.
 */
export async function getSession(): Promise<PublicUser | null> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;

  try {
    const res = await fetch(`${ENV.NEXT_PUBLIC_SERVER_URL}/auth/me`, {
      headers: { cookie: cookieHeader },
      // Never cache a session lookup — a stale hit would show a signed-out
      // user as signed in.
      cache: "no-store",
    });

    if (!res.ok) return null;

    const body = (await res.json()) as { user: PublicUser };
    return body.user;
  } catch {
    // API unreachable is treated as signed out rather than a crashed page.
    return null;
  }
}

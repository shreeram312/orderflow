import { cookies } from "next/headers";

import { ENV } from "@/env";
import type { MenuItem, RestaurantSettings, WalletSummary } from "./api";

/**
 * Server Components do not forward browser cookies to `fetch`, so the Cookie
 * header is copied across by hand — the same reason `getSession` does it.
 * Unwraps the { status, message, data } envelope, like the client does.
 */
async function serverGet<T>(path: string): Promise<T> {
  const cookieHeader = (await cookies()).toString();

  const res = await fetch(`${ENV.NEXT_PUBLIC_SERVER_URL}${path}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  const body = (await res.json().catch(() => null)) as { status?: boolean; data?: T } | null;

  if (!res.ok || body?.status === false || !body?.data) {
    throw new Error(`GET ${path} failed with ${res.status}`);
  }

  return body.data;
}

export function getKitchenMenu() {
  return serverGet<{ items: MenuItem[] }>("/kitchen/menu?includeArchived=true");
}

export function getRestaurantSettings() {
  return serverGet<{ settings: RestaurantSettings }>("/kitchen/settings");
}

export function getCustomerMenu() {
  return serverGet<{ isOpen: boolean; items: MenuItem[] }>("/menu");
}

export function getWallet() {
  return serverGet<{ wallet: WalletSummary }>("/wallet");
}

/**
 * Read through `process.env` rather than varlock's ENV proxy: this module runs
 * in the browser, and only `process.env.NEXT_PUBLIC_*` is statically inlined
 * into the client bundle. The proxy resolves to undefined there.
 */
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

export type Role = "CUSTOMER" | "KITCHEN";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  restaurantName: string | null;
  phone: string | null;
};

/** Field-keyed messages from the server's Zod validation, e.g. { email: ["..."] }. */
export type FieldErrors = Record<string, string[] | undefined>;

export class ApiError extends Error {
  readonly code: string;
  readonly fieldErrors: FieldErrors;

  constructor(code: string, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Where each role lands after signing in. */
export function homePathFor(role: Role): "/customer" | "/kitchen" {
  return role === "KITCHEN" ? "/kitchen" : "/customer";
}

/** Success envelope from the server: { status: true, message, data }. */
type Envelope<T> = { status: true; message: string; data: T };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${SERVER_URL}${path}`, {
      ...init,
      // Without this the browser neither sends nor stores the session cookie,
      // and every request after login comes back 401.
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Could not reach the server. Is it running on port 3000?");
  }

  const body = await res.json().catch(() => null);

  // The server sets `status: false` on every failure, so one check covers all
  // of them without inspecting HTTP codes.
  if (!res.ok || body?.status === false) {
    throw new ApiError(
      body?.error ?? "INTERNAL_ERROR",
      body?.message ?? "Something went wrong",
      body?.details ?? {},
    );
  }

  return (body as Envelope<T>).data;
}

export type MenuCategory = "STARTERS" | "MAINS" | "SIDES" | "DESSERTS" | "BEVERAGES";
export type MenuItemStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

export const MENU_CATEGORIES: MenuCategory[] = [
  "STARTERS",
  "MAINS",
  "SIDES",
  "DESSERTS",
  "BEVERAGES",
];

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: MenuCategory;
  status: MenuItemStatus;
  isVeg: boolean;
  imageUrl: string | null;
  prepTimeMinutes: number;
};

export type MenuItemInput = {
  name: string;
  description?: string;
  price: number;
  category: MenuCategory;
  isVeg: boolean;
  imageUrl?: string;
  prepTimeMinutes: number;
};

export type RestaurantSettings = {
  name: string;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
};

export type WalletSummary = { balance: number };

export type WalletTransaction = {
  id: string;
  type: "TOPUP" | "DEBIT" | "REFUND";
  amount: number;
  balanceAfter: number;
  note: string | null;
  orderId: string | null;
  createdAt: string;
};

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export type OrderLine = {
  id: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type Order = {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  failureReason: string | null;
  createdAt: string;
  items: OrderLine[];
};

type AuthResponse = { user: PublicUser };

export const api = {
  signupCustomer: (input: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => request<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify(input) }),

  signupKitchen: (input: {
    name: string;
    restaurantName: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
    code: string;
  }) =>
    request<AuthResponse>("/auth/signup/kitchen", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) }),

  logout: () => request<null>("/auth/logout", { method: "POST" }),

  // --- customer ---
  getMenu: () => request<{ isOpen: boolean; items: MenuItem[] }>("/menu", { method: "GET" }),

  // --- kitchen ---
  getSettings: () =>
    request<{ settings: RestaurantSettings }>("/kitchen/settings", { method: "GET" }),

  updateSettings: (input: Partial<RestaurantSettings>) =>
    request<{ settings: RestaurantSettings }>("/kitchen/settings", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  listKitchenMenu: (opts?: { includeArchived?: boolean }) =>
    request<{ items: MenuItem[] }>(
      `/kitchen/menu${opts?.includeArchived ? "?includeArchived=true" : ""}`,
      { method: "GET" },
    ),

  createMenuItem: (input: MenuItemInput) =>
    request<{ item: MenuItem }>("/kitchen/menu", { method: "POST", body: JSON.stringify(input) }),

  updateMenuItem: (id: string, input: Partial<MenuItemInput>) =>
    request<{ item: MenuItem }>(`/kitchen/menu/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  setMenuItemStatus: (id: string, status: MenuItemStatus) =>
    request<{ item: MenuItem }>(`/kitchen/menu/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  archiveMenuItem: (id: string) =>
    request<{ item: MenuItem }>(`/kitchen/menu/${id}`, { method: "DELETE" }),

  // --- wallet (customer) ---
  getWallet: () => request<{ wallet: WalletSummary }>("/wallet", { method: "GET" }),

  topUpWallet: (amount: number) =>
    request<{ wallet: WalletSummary }>("/wallet/topup", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  listWalletTransactions: () =>
    request<{ transactions: WalletTransaction[] }>("/wallet/transactions", { method: "GET" }),

  // --- orders (customer) ---
  createOrder: (items: { menuItemId: string; quantity: number }[]) =>
    request<{ order: Order }>("/orders", { method: "POST", body: JSON.stringify({ items }) }),

  listOrders: () => request<{ orders: Order[] }>("/orders", { method: "GET" }),
};

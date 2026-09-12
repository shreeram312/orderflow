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

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      body?.error ?? "INTERNAL_ERROR",
      body?.message ?? "Something went wrong",
      body?.details ?? {},
    );
  }

  return body as T;
}

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

  logout: () => request<void>("/auth/logout", { method: "POST" }),
};

import { Prisma } from "@my-better-t-app/db";

import { env } from "../../env.server";
import { conflict, forbidden, unauthenticated } from "../../lib/http-error";
import { hashPassword, verifyPassword } from "../../lib/password";
import { getDb } from "../../services";
import type { CustomerSignupInput, KitchenSignupInput, LoginInput } from "./auth.schemas";

/** The only user shape that ever leaves the server. Note the absent passwordHash. */
export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "KITCHEN";
  restaurantName: string | null;
  phone: string | null;
};

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  restaurantName: true,
  phone: true,
} as const;

/** Prisma's code for a unique-constraint violation. */
const UNIQUE_VIOLATION = "P2002";

function rethrowEmailTaken(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) {
    throw conflict("EMAIL_TAKEN", "An account with this email already exists");
  }
  throw error;
}

export async function registerCustomer(input: CustomerSignupInput): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);

  try {
    return await getDb().user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        role: "CUSTOMER", // hardcoded — never taken from the request body
      },
      select: publicUserSelect,
    });
  } catch (error) {
    rethrowEmailTaken(error);
  }
}

export async function registerKitchen(input: KitchenSignupInput): Promise<PublicUser> {
  if (input.code !== env.KITCHEN_SIGNUP_CODE) {
    throw forbidden("Invalid staff signup code");
  }

  const passwordHash = await hashPassword(input.password);

  try {
    return await getDb().user.create({
      data: {
        email: input.email,
        name: input.name,
        restaurantName: input.restaurantName,
        phone: input.phone,
        passwordHash,
        role: "KITCHEN", // hardcoded — the code above is the only gate
      },
      select: publicUserSelect,
    });
  } catch (error) {
    rethrowEmailTaken(error);
  }
}

export async function login(input: LoginInput): Promise<PublicUser> {
  const user = await getDb().user.findUnique({ where: { email: input.email } });

  // Same error for "no such email" and "wrong password", so the response cannot
  // be used to enumerate which addresses have accounts.
  if (!user) throw unauthenticated("Email or password is incorrect");

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) throw unauthenticated("Email or password is incorrect");

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    restaurantName: user.restaurantName,
    phone: user.phone,
  };
}

export async function findPublicUser(userId: string): Promise<PublicUser | null> {
  return getDb().user.findUnique({ where: { id: userId }, select: publicUserSelect });
}

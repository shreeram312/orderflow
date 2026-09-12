import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../prisma/generated/client";
import type { DatabaseConfig } from "./config";

export function createPrismaClient(env: DatabaseConfig) {
  const adapter = new PrismaNeon({
    connectionString: env.DATABASE_URL,
  });

  return new PrismaClient({ adapter });
}

export type Database = ReturnType<typeof createPrismaClient>;

/**
 * Re-exported so apps never reach past this package's exports map into
 * ../prisma/generated. Prisma carries the known-error class used to detect
 * unique-constraint violations; Role is the enum shared with the API layer.
 */
export { Prisma } from "../prisma/generated/client";
export { Role } from "../prisma/generated/enums";
export type { User } from "../prisma/generated/client";

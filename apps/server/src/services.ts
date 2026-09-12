import { type Database, createPrismaClient } from "@my-better-t-app/db";

import { env } from "./env.server";

const db = createPrismaClient(env);

export function getDb(): Database {
  return db;
}

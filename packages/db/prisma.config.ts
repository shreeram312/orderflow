import path from "node:path";

import { defineConfig, env } from "prisma/config";

// `prisma generate` never touches the database, and on a fresh host it runs
// from `pnpm install` before any env is set. Every other command (migrate,
// studio) reads DATABASE_URL from apps/server/.env through varlock, which
// exits the process on a missing value, so it is only loaded for those.
const generating = process.argv.includes("generate");
if (!generating) {
  await import("varlock/auto-load");
}

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: generating ? "postgresql://unused-by-generate" : env("DATABASE_URL"),
  },
});

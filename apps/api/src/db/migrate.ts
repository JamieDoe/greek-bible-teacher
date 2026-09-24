import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

/** Applies all pending migrations. Safe to run repeatedly (used on deploy and by tests). */
export async function runMigrations(databaseUrl: string): Promise<void> {
  // One connection; silence "already exists, skipping" notices from the migrator.
  const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle({ client }), { migrationsFolder });
  } finally {
    await client.end();
  }
}

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export interface DbOptions {
  max?: number;
  /** Server-side cap per statement, so a bad plan fails fast instead of hanging. */
  statementTimeoutMs?: number;
  /** Drop Postgres NOTICE messages (e.g. "truncate cascades to …"). */
  quiet?: boolean;
}

export function createDb(databaseUrl: string, options: DbOptions = {}) {
  const client = postgres(databaseUrl, {
    max: options.max ?? 10,
    ...(options.statementTimeoutMs
      ? { connection: { statement_timeout: options.statementTimeoutMs } }
      : {}),
    ...(options.quiet ? { onnotice: () => {} } : {}),
  });
  const db = drizzle({ client, schema });
  return { db, client };
}

export type Db = ReturnType<typeof createDb>["db"];

/** The query surface shared by the database and a transaction, for helpers that run in either. */
export type DbOrTx = Pick<
  Db,
  "select" | "selectDistinct" | "insert" | "update" | "delete" | "execute"
>;

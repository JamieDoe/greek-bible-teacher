import { serve } from "@hono/node-server";
import { sql } from "drizzle-orm";
import { createApp } from "./app";
import { createDb } from "./db/client";
import { parseEnv } from "./env";

const env = parseEnv(process.env);
const { db, client } = createDb(env.DATABASE_URL);
const app = createApp(env, {
  pingDb: async () => {
    await db.execute(sql`select 1`);
  },
});

const server = serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port}`);
});

function shutdown(signal: string) {
  console.log(`[api] ${signal} received, shutting down`);
  server.close(() => {
    void client.end().finally(() => process.exit(0));
  });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

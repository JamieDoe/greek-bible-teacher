import { runMigrations } from "../db/migrate";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

try {
  await runMigrations(url);
  console.log("[migrate] migrations applied");
} catch (err) {
  console.error("[migrate] failed:", err);
  process.exit(1);
}

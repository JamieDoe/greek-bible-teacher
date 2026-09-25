import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** One row per upstream dataset (or `curated` for hand-written content), with its licence. */
export const dataSources = pgTable("data_sources", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  /** Stable slug used by ingestion scripts to upsert, e.g. `morphgnt-sblgnt`, `curated`. */
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  version: text("version"),
  licence: text("licence").notNull(),
  attribution: text("attribution").notNull(),
  url: text("url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

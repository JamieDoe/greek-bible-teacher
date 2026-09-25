import { sql } from "drizzle-orm";
import type { DbOrTx } from "../db/client";
import { readingEvents, reviewEvents } from "../db/schema";

/**
 * Local calendar days (in `tz`) on which the learner reviewed a word or finished a reading.
 * `tz` must already be a validated IANA zone.
 */
export async function practiceDays(db: DbOrTx, userId: string, tz: string): Promise<string[]> {
  const rows = await db.execute<{ d: string }>(sql`
    select distinct d::text as d from (
      select (reviewed_at at time zone ${tz})::date as d from ${reviewEvents} where user_id = ${userId}
      union
      select (completed_at at time zone ${tz})::date as d from ${readingEvents} where user_id = ${userId}
    ) days order by d`);
  return rows.map((r) => r.d);
}

/** Monday of the week containing `isoDate` (YYYY-MM-DD), and the 7 dates of that week. */
export function weekOf(isoDate: string): string[] {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(monday.getTime() + i * 86_400_000).toISOString().slice(0, 10),
  );
}

/** Today's date in `tz` as YYYY-MM-DD. */
export function localDate(now: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
}

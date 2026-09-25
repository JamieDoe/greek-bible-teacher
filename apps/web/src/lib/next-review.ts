const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const relative = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

/**
 * When the next review is, in words, for empty states: "in 5 minutes", "in 3 hours",
 * "tomorrow", "in 4 days". Minutes round up, so "in 1 minute" is never early; hours and days
 * round to the nearest.
 */
export function nextReviewIn(next: Date, now: Date): string {
  const ms = Math.max(0, next.getTime() - now.getTime());
  if (ms < HOUR) return relative.format(Math.max(1, Math.ceil(ms / 60_000)), "minute");
  if (ms < 20 * HOUR) return relative.format(Math.max(1, Math.round(ms / HOUR)), "hour");
  return relative.format(Math.max(1, Math.round(ms / DAY)), "day");
}

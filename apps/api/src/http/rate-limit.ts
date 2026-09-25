import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import { ApiHttpError } from "./errors";

/**
 * Fixed-window counters per key, kept in memory. That is enough for the single API instance this
 * app runs (DECISIONS 025); several instances would need a shared store.
 */
export class WindowCounter {
  private readonly windows = new Map<string, { start: number; count: number }>();
  private nextPrune = 0;

  constructor(
    readonly limit: number,
    readonly windowMs: number,
  ) {}

  /** Seconds until `key` may try again, or null while it is under the limit. */
  retryAfter(key: string, now: number): number | null {
    const w = this.current(key, now);
    if (!w || w.count < this.limit) return null;
    return Math.max(1, Math.ceil((w.start + this.windowMs - now) / 1000));
  }

  record(key: string, now: number): void {
    this.prune(now);
    const w = this.current(key, now);
    if (w) w.count += 1;
    else this.windows.set(key, { start: now, count: 1 });
  }

  private current(key: string, now: number) {
    const w = this.windows.get(key);
    return w && now - w.start < this.windowMs ? w : undefined;
  }

  /** Drops expired windows once per window, so memory follows recent clients only. */
  private prune(now: number) {
    if (now < this.nextPrune) return;
    for (const [key, w] of this.windows) {
      if (now - w.start >= this.windowMs) this.windows.delete(key);
    }
    this.nextPrune = now + this.windowMs;
  }
}

/**
 * The client's IP. Behind Caddy (or Nginx) and Next's /api rewrite, the proxy nearest the
 * client appends the real address as the last X-Forwarded-For entry, and Next passes the header
 * through. Anything to its left came from the client and can't be trusted. Direct requests (dev,
 * tests) fall back to the socket address.
 */
export function clientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  const last = forwarded
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .at(-1);
  if (last) return last;
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown"; // no socket, e.g. app.request() in tests
  }
}

export function tooManyRequests(c: Context, retryAfterSeconds: number): ApiHttpError {
  c.header("Retry-After", String(retryAfterSeconds));
  return new ApiHttpError(
    429,
    "rate_limited",
    "Too many requests. Please wait a moment and try again.",
  );
}

export interface RateLimits {
  /** All requests per client IP per minute; null when off. */
  requests: WindowCounter | null;
  /** New anonymous users per client IP per hour; null when off. */
  newSessions: WindowCounter | null;
  /** Failed recovery-code attempts per client IP per hour; always on (DECISIONS 027). */
  restoreFailures: WindowCounter;
}

export const RESTORE_FAILURES_PER_HOUR = 10;

export function createRateLimits(env: {
  RATE_LIMIT_PER_MINUTE: number;
  NEW_SESSIONS_PER_HOUR: number;
}): RateLimits {
  return {
    requests:
      env.RATE_LIMIT_PER_MINUTE > 0 ? new WindowCounter(env.RATE_LIMIT_PER_MINUTE, 60_000) : null,
    newSessions:
      env.NEW_SESSIONS_PER_HOUR > 0
        ? new WindowCounter(env.NEW_SESSIONS_PER_HOUR, 3_600_000)
        : null,
    restoreFailures: new WindowCounter(RESTORE_FAILURES_PER_HOUR, 3_600_000),
  };
}

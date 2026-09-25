import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { Env } from "../env";

export const SESSION_COOKIE = "gbt_uid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The anonymous user id from the cookie, if it is well-formed. Existence is checked separately. */
export function readSessionUserId(c: Context): string | null {
  const value = getCookie(c, SESSION_COOKIE);
  return value && UUID.test(value) ? value : null;
}

export function writeSessionCookie(c: Context, env: Env, userId: string): void {
  setCookie(c, SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "Lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 400 * 24 * 60 * 60, // browsers cap cookie lifetime at 400 days
  });
}

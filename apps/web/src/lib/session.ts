import { type SessionResponse, sessionResponseSchema } from "@gbt/shared";
import { apiPost } from "./api-client";

let pending: Promise<SessionResponse> | null = null;

/**
 * Starts (or resumes) the anonymous session once per page load. Calls that need a user await
 * this first, so a first visit never races the cookie being set.
 */
export function ensureSession(): Promise<SessionResponse> {
  pending ??= apiPost("/session/anonymous", sessionResponseSchema).catch((err: unknown) => {
    pending = null; // allow a retry
    throw err;
  });
  return pending;
}

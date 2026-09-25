import type { z } from "zod";
import { toApiRequestError } from "./api-errors";

// For Client Components: same-origin calls through the /api rewrite, so the httpOnly
// session cookie is sent automatically.
async function request<T extends z.ZodType>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  schema: T,
  body?: unknown,
  signal?: AbortSignal,
): Promise<z.infer<T>> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw await toApiRequestError(res);
  return schema.parse(await res.json());
}

export const apiGet = <T extends z.ZodType>(path: string, schema: T, signal?: AbortSignal) =>
  request("GET", path, schema, undefined, signal);

export const apiPost = <T extends z.ZodType>(path: string, schema: T, body?: unknown) =>
  request("POST", path, schema, body);

export const apiPatch = <T extends z.ZodType>(path: string, schema: T, body: unknown) =>
  request("PATCH", path, schema, body);

/** POST for endpoints that answer 204 No Content. */
export async function apiPostNoContent(path: string, body?: unknown): Promise<void> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await toApiRequestError(res);
}

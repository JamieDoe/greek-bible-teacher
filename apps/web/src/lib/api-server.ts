import type { z } from "zod";
import { toApiRequestError } from "./api-errors";

// For Server Components only: calls the API directly (server to server). Only public,
// non-user-specific data is fetched this way; the session cookie lives on the browser side.
const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8787";

export async function serverGet<T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>> {
  const res = await fetch(`${apiInternalUrl}${path}`, { cache: "no-store" });
  if (!res.ok) throw await toApiRequestError(res);
  return schema.parse(await res.json());
}

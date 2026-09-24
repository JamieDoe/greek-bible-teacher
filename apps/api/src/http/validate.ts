import type { Context } from "hono";
import type { z } from "zod";
import { ApiHttpError } from "./errors";

function invalid(where: string, error: z.ZodError): ApiHttpError {
  return new ApiHttpError(400, "validation_error", `Invalid ${where}`, error.issues);
}

/** Validates one path parameter, e.g. `validParam(c, "id", idParamSchema)`. */
export function validParam<T extends z.ZodType>(c: Context, name: string, schema: T): z.infer<T> {
  const result = schema.safeParse(c.req.param(name));
  if (!result.success) throw invalid(`path parameter "${name}"`, result.error);
  return result.data;
}

/** Parses and validates a JSON body. */
export async function validBody<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new ApiHttpError(400, "validation_error", "Request body must be valid JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw invalid("request body", result.error);
  return result.data;
}

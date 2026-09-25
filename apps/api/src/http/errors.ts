import type { ContentfulStatusCode } from "hono/utils/http-status";

/** An error with a stable code that the error handler turns into the shared ApiError shape. */
export class ApiHttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiHttpError";
  }
}

export const notFound = (what: string) => new ApiHttpError(404, "not_found", `${what} not found`);

import { apiErrorSchema } from "@gbt/shared";

/** A failed API call, with the server's error code when it sent one. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function toApiRequestError(res: Response): Promise<ApiRequestError> {
  const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
  return parsed.success
    ? new ApiRequestError(res.status, parsed.data.error.code, parsed.data.error.message)
    : new ApiRequestError(res.status, "unknown", `Request failed with status ${res.status}`);
}

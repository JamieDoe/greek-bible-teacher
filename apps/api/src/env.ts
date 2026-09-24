import { z } from "zod";

// Compose passes an unset variable as "", which must mean "use the default", not 0.
const optionalCount = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.coerce.number().int().min(0).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  /** Exact origin of the web app; the only origin CORS allows. */
  WEB_ORIGIN: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "must be a postgres:// connection URL"),
  /** Requests per client IP per minute; 0 turns the limit off. Default: 600 in production. */
  RATE_LIMIT_PER_MINUTE: optionalCount,
  /** New anonymous users per client IP per hour; 0 turns it off. Default: 60 in production. */
  NEW_SESSIONS_PER_HOUR: optionalCount,
});

/** Rate limits are on by default only in production, so development and tests never trip them. */
const PRODUCTION_LIMITS = { RATE_LIMIT_PER_MINUTE: 600, NEW_SESSIONS_PER_HOUR: 60 };

export type Env = Omit<z.infer<typeof envSchema>, keyof typeof PRODUCTION_LIMITS> &
  Record<keyof typeof PRODUCTION_LIMITS, number>;

/** Parses env vars, throwing one readable error listing every invalid variable. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  const env = result.data;
  const production = env.NODE_ENV === "production";
  return {
    ...env,
    RATE_LIMIT_PER_MINUTE:
      env.RATE_LIMIT_PER_MINUTE ?? (production ? PRODUCTION_LIMITS.RATE_LIMIT_PER_MINUTE : 0),
    NEW_SESSIONS_PER_HOUR:
      env.NEW_SESSIONS_PER_HOUR ?? (production ? PRODUCTION_LIMITS.NEW_SESSIONS_PER_HOUR : 0),
  };
}

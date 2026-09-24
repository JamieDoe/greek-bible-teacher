import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const DATABASE_URL = "postgres://u:p@localhost:5432/greek";

describe("parseEnv", () => {
  it("applies defaults", () => {
    expect(parseEnv({ DATABASE_URL })).toEqual({
      NODE_ENV: "development",
      API_PORT: 8787,
      WEB_ORIGIN: "http://localhost:3000",
      DATABASE_URL,
      RATE_LIMIT_PER_MINUTE: 0,
      NEW_SESSIONS_PER_HOUR: 0,
    });
  });

  it("turns rate limits on by default only in production, and allows overrides", () => {
    expect(parseEnv({ DATABASE_URL, NODE_ENV: "production" })).toMatchObject({
      RATE_LIMIT_PER_MINUTE: 600,
      NEW_SESSIONS_PER_HOUR: 60,
    });
    expect(
      parseEnv({
        DATABASE_URL,
        NODE_ENV: "production",
        RATE_LIMIT_PER_MINUTE: "0",
        NEW_SESSIONS_PER_HOUR: "5",
      }),
    ).toMatchObject({ RATE_LIMIT_PER_MINUTE: 0, NEW_SESSIONS_PER_HOUR: 5 });
    // An empty value (an unset variable passed through by Compose) keeps the default.
    expect(
      parseEnv({ DATABASE_URL, NODE_ENV: "production", RATE_LIMIT_PER_MINUTE: "" })
        .RATE_LIMIT_PER_MINUTE,
    ).toBe(600);
    expect(() => parseEnv({ DATABASE_URL, RATE_LIMIT_PER_MINUTE: "-1" })).toThrow(
      /RATE_LIMIT_PER_MINUTE/,
    );
  });

  it("coerces the port from a string", () => {
    expect(parseEnv({ DATABASE_URL, API_PORT: "9000" }).API_PORT).toBe(9000);
  });

  it("requires a postgres DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ DATABASE_URL: "mysql://x" })).toThrow(/DATABASE_URL/);
  });

  it("lists every invalid variable in one error", () => {
    expect(() => parseEnv({ DATABASE_URL, API_PORT: "abc", WEB_ORIGIN: "not a url" })).toThrow(
      /API_PORT[\s\S]*WEB_ORIGIN/,
    );
  });
});

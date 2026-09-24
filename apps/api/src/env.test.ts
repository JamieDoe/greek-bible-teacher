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
    });
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

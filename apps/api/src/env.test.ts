import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("applies defaults", () => {
    expect(parseEnv({})).toEqual({
      NODE_ENV: "development",
      API_PORT: 8787,
      WEB_ORIGIN: "http://localhost:3000",
    });
  });

  it("coerces the port from a string", () => {
    expect(parseEnv({ API_PORT: "9000" }).API_PORT).toBe(9000);
  });

  it("lists every invalid variable in one error", () => {
    expect(() => parseEnv({ API_PORT: "abc", WEB_ORIGIN: "not a url" })).toThrow(
      /API_PORT[\s\S]*WEB_ORIGIN/,
    );
  });
});

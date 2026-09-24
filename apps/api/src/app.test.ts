import { apiErrorSchema, healthResponseSchema } from "@gbt/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { parseEnv } from "./env";

const WEB_ORIGIN = "http://localhost:3000";
const app = createApp(parseEnv({ NODE_ENV: "test", WEB_ORIGIN }));

describe("GET /health", () => {
  it("returns ok in the shared response shape", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = healthResponseSchema.parse(await res.json());
    expect(body.status).toBe("ok");
  });
});

describe("unknown routes", () => {
  it("return 404 in the shared error shape", async () => {
    const res = await app.request("/nope");
    expect(res.status).toBe(404);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("not_found");
  });
});

describe("CORS", () => {
  const preflight = (origin: string) =>
    app.request("/health", {
      method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": "POST" },
    });

  it("allows the configured web origin with credentials", async () => {
    const res = await preflight(WEB_ORIGIN);
    expect(res.headers.get("access-control-allow-origin")).toBe(WEB_ORIGIN);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("does not allow other origins", async () => {
    const res = await preflight("https://evil.example");
    expect(res.headers.get("access-control-allow-origin")).not.toBe("https://evil.example");
  });
});

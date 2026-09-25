import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.literal("api"),
  db: z.enum(["ok", "unavailable"]),
  time: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

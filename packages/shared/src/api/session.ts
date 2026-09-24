import { z } from "zod";
import { disclosureLevels, experienceLevels } from "../learning/enums";

/** The current learner. The user id stays in the httpOnly cookie and is never sent to JS. */
export const sessionResponseSchema = z.object({
  user: z.object({
    disclosureLevel: z.enum(disclosureLevels),
    experienceLevel: z.enum(experienceLevels).nullable(),
    dailyMinutes: z.number().int().nullable(),
    onboarded: z.boolean(),
  }),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const updatePreferencesRequestSchema = z
  .object({ disclosureLevel: z.enum(disclosureLevels) })
  .strict();
export type UpdatePreferencesRequest = z.infer<typeof updatePreferencesRequestSchema>;

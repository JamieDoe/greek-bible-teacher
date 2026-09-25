import { z } from "zod";
import { disclosureLevels, experienceLevels } from "../learning/enums";
import { normalizeRecoveryCode } from "../identity/recovery-code";
import { DAILY_MINUTE_OPTIONS } from "./daily-minutes";

/** The current learner. The user id stays in the httpOnly cookie and is never sent to JS. */
export const sessionResponseSchema = z.object({
  user: z.object({
    disclosureLevel: z.enum(disclosureLevels),
    experienceLevel: z.enum(experienceLevels).nullable(),
    dailyMinutes: z.number().int().nullable(),
    onboarded: z.boolean(),
    /** When the current recovery code was made (the code itself is never stored or re-sent). */
    recoveryCodeCreatedAt: z.iso.datetime().nullable(),
  }),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/** A new recovery code, shown to the learner once. It replaces any earlier code. */
export const recoveryCodeResponseSchema = z.object({
  code: z.string(),
  createdAt: z.iso.datetime(),
});
export type RecoveryCodeResponse = z.infer<typeof recoveryCodeResponseSchema>;

/** `POST /session/restore`: the code as typed; it is normalised to its canonical form. */
export const restoreSessionRequestSchema = z
  .object({
    code: z
      .string()
      .max(64)
      .transform((typed, ctx) => {
        const code = normalizeRecoveryCode(typed);
        if (code === null) {
          ctx.addIssue({ code: "custom", message: "That doesn't look like a recovery code" });
          return z.NEVER;
        }
        return code;
      }),
  })
  .strict();
export type RestoreSessionRequest = z.input<typeof restoreSessionRequestSchema>;

export const updatePreferencesRequestSchema = z
  .object({
    disclosureLevel: z.enum(disclosureLevels),
    dailyMinutes: z.union(DAILY_MINUTE_OPTIONS.map((m) => z.literal(m))),
  })
  .partial()
  .strict()
  .refine((p) => Object.keys(p).length > 0, "Nothing to update");
export type UpdatePreferencesRequest = z.infer<typeof updatePreferencesRequestSchema>;

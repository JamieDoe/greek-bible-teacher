import { createHash, randomBytes } from "node:crypto";
import {
  type DisclosureLevel,
  formatRecoveryCode,
  type OnboardingRequest,
  RECOVERY_CODE_BYTES,
  type RecoveryCodeResponse,
  recoveryCodeFromBytes,
  type SessionResponse,
} from "@gbt/shared";
import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { users } from "../db/schema";

type UserRow = typeof users.$inferSelect;

export async function findUser(db: Db, id: string): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function createUser(db: Db): Promise<UserRow> {
  const [row] = await db.insert(users).values({}).returning();
  return row!;
}

export async function updatePreferences(
  db: Db,
  id: string,
  prefs: { disclosureLevel?: DisclosureLevel; dailyMinutes?: number },
) {
  const [row] = await db.update(users).set(prefs).where(eq(users.id, id)).returning();
  return row ?? null;
}

/** Saves onboarding answers; the first onboarding date is kept if they are changed later. */
export async function completeOnboarding(
  db: Db,
  id: string,
  answers: OnboardingRequest,
  now: Date,
) {
  const [row] = await db
    .update(users)
    .set({
      experienceLevel: answers.experienceLevel,
      dailyMinutes: answers.dailyMinutes,
      onboardedAt: sql`coalesce(${users.onboardedAt}, ${now.toISOString()}::timestamptz)`,
    })
    .where(eq(users.id, id))
    .returning();
  return row ?? null;
}

export function toSessionResponse(user: UserRow): SessionResponse {
  return {
    user: {
      disclosureLevel: user.disclosureLevel,
      experienceLevel: user.experienceLevel,
      dailyMinutes: user.dailyMinutes,
      onboarded: user.onboardedAt !== null,
      recoveryCodeCreatedAt: user.recoveryCodeCreatedAt?.toISOString() ?? null,
    },
  };
}

/**
 * The stored form of a canonical recovery code. Codes carry 80 random bits, so a fast hash is
 * enough: there is no dictionary to guess from, unlike a password (DECISIONS 027).
 */
export const hashRecoveryCode = (canonical: string) =>
  createHash("sha256").update(canonical).digest("hex");

/** Makes a new recovery code for the learner, replacing any earlier one. Shown once. */
export async function createRecoveryCode(
  db: Db,
  id: string,
  now: Date,
): Promise<RecoveryCodeResponse> {
  const code = recoveryCodeFromBytes(randomBytes(RECOVERY_CODE_BYTES));
  await db
    .update(users)
    .set({ recoveryCodeHash: hashRecoveryCode(code), recoveryCodeCreatedAt: now })
    .where(eq(users.id, id));
  return { code: formatRecoveryCode(code), createdAt: now.toISOString() };
}

export async function findUserByRecoveryCode(db: Db, canonical: string): Promise<UserRow | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.recoveryCodeHash, hashRecoveryCode(canonical)));
  return row ?? null;
}

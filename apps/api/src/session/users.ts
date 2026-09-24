import type { DisclosureLevel, OnboardingRequest, SessionResponse } from "@gbt/shared";
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

export async function setDisclosureLevel(db: Db, id: string, level: DisclosureLevel) {
  const [row] = await db
    .update(users)
    .set({ disclosureLevel: level })
    .where(eq(users.id, id))
    .returning();
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
    },
  };
}

import type { DisclosureLevel, SessionResponse } from "@gbt/shared";
import { eq } from "drizzle-orm";
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

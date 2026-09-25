import { reviewQueueResponseSchema } from "@gbt/shared";
import { expect, type Page } from "@playwright/test";

export const sheet = (page: Page) => page.getByRole("dialog");

/** The reader's Greek text (the lesson header also carries a Greek stage mark). */
export const greekText = (page: Page) => page.locator('article [lang="grc"]').first();

export async function openJohn(page: Page) {
  await page.goto("/read");
  await page.getByRole("link", { name: /John 1:1–5/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "John 1:1–5" })).toBeVisible();
}

/** Taps a word, waits for the sheet and for the lookup to be recorded, then closes it. */
export async function lookUp(page: Page, word: string) {
  const recorded = page.waitForResponse(
    (r) => r.url().includes("/lookup") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: word, exact: true }).first().click();
  await expect(sheet(page)).toBeVisible();
  expect((await recorded).status()).toBe(204);
  await page.keyboard.press("Escape");
  await expect(sheet(page)).toBeHidden();
}

/**
 * Collects the gloss of every word served by the review queue (glosses never vary). Option
 * order is shuffled per response (and dev StrictMode fetches twice), so answers are chosen by
 * gloss text, which every response agrees on.
 */
export function trackGlosses(page: Page) {
  const glosses = new Map<number, string>();
  page.on("response", async (res) => {
    if (!res.url().includes("/api/review/queue") || !res.ok()) return;
    const q = reviewQueueResponseSchema.safeParse(await res.json().catch(() => null));
    if (q.success) for (const item of q.data.items) glosses.set(item.lemmaId, item.lemma.gloss);
  });
  return glosses;
}

/**
 * Answers the current card (after its introduction, if any), right or wrong, and continues.
 * Returns the lemma id answered.
 */
export async function answerCard(
  page: Page,
  glosses: Map<number, string>,
  { correct = true, ease }: { correct?: boolean; ease?: "Hard" | "Good" | "Easy" } = {},
) {
  const card = page.locator("section[data-lemma-id]");
  await expect(card).toBeVisible();
  const gotIt = card.getByRole("button", { name: "Got it", exact: true });
  if (await gotIt.isVisible()) await gotIt.click();
  const lemmaId = Number(await card.getAttribute("data-lemma-id"));
  await expect.poll(() => glosses.has(lemmaId)).toBe(true);
  const answer = new RegExp(`^${glosses.get(lemmaId)}$`);
  const options = card.locator("ul button");
  await (correct ? options.filter({ hasText: answer }) : options.filter({ hasNotText: answer }))
    .first()
    .click();
  const feedback = page.locator("#feedback");
  await expect(feedback.getByRole("status")).toContainText(correct ? "Correct" : "Not quite");
  if (ease) await feedback.getByRole("radio", { name: ease }).click();
  await feedback.getByRole("button", { name: "Continue" }).click();
  // The card stays until its grade is saved; wait for the next one.
  await expect(feedback).toBeHidden();
  return lemmaId;
}

/** Answers every card correctly until the review is done. */
export async function answerAll(page: Page, glosses: Map<number, string>) {
  const card = page.locator("section[data-lemma-id]");
  const done = page.getByRole("heading", { name: "Review done" });
  for (let i = 0; i < 30; i++) {
    await expect(card.or(done)).toBeVisible();
    if (await done.isVisible()) return;
    await answerCard(page, glosses);
  }
  throw new Error("review did not finish");
}

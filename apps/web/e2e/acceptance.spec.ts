import { reviewQueueResponseSchema } from "@gbt/shared";
import { expect, type Page, test } from "@playwright/test";

// The MVP acceptance flow (docs/ACCEPTANCE.md): a brand-new learner onboards, works through
// lesson 1's daily loop end to end, and sees Today and their progress reflect it.

/** Collects the gloss of every word served by the review queue (glosses never vary). */
function trackGlosses(page: Page) {
  const glosses = new Map<number, string>();
  page.on("response", async (res) => {
    if (!res.url().includes("/api/review/queue") || !res.ok()) return;
    const q = reviewQueueResponseSchema.safeParse(await res.json().catch(() => null));
    if (q.success) for (const item of q.data.items) glosses.set(item.lemmaId, item.lemma.gloss);
  });
  return glosses;
}

/** Answers every card in the current review correctly (grading Good) until it is done. */
async function answerAll(page: Page, glosses: Map<number, string>) {
  const card = page.locator("section[data-lemma-id]");
  const done = page.getByRole("heading", { name: "Review done" });
  for (let i = 0; i < 30; i++) {
    await expect(card.or(done)).toBeVisible();
    if (await done.isVisible()) return;
    const gotIt = page.getByRole("button", { name: "Got it, test me" });
    if (await gotIt.isVisible()) await gotIt.click();
    const lemmaId = Number(await card.getAttribute("data-lemma-id"));
    await expect.poll(() => glosses.has(lemmaId)).toBe(true);
    await card
      .locator("ul button")
      .filter({ hasText: new RegExp(`^${glosses.get(lemmaId)}$`) })
      .click();
    await expect(page.getByText("Correct. How easy was it?")).toBeVisible();
    await page.getByRole("button", { name: "good" }).click();
    // The card stays until its grade is saved; wait for the next one.
    await expect(page.getByText("Correct. How easy was it?")).toBeHidden();
  }
  throw new Error("review did not finish");
}

async function lookUp(page: Page, word: string) {
  await page.getByRole("button", { name: word, exact: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
}

const stepLabel = (page: Page, n: number, name: string) =>
  expect(page.getByText(`Step ${n} of 7: ${name}`)).toBeVisible();

test("MVP acceptance: onboard → daily lesson loop → Today and progress", async ({ page }) => {
  test.setTimeout(180_000);
  const glosses = trackGlosses(page);

  // 1. A new visitor is onboarded (no account, no personal data).
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByText("None yet").click();
  await page.getByText("10 minutes").click();
  await page.getByRole("button", { name: "Start learning" }).click();

  // 2. Today shows lesson 1, its concept and passage, nothing due, zero progress.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "In the beginning was the Word" })).toBeVisible();
  await expect(page.getByText("Today’s lesson · Lesson 1")).toBeVisible();
  await expect(page.getByText("The article and case: who is what")).toBeVisible();
  await expect(page.getByTestId("due-count")).toHaveText("0");
  await expect(page.getByTestId("progress")).toContainText("Words in review0");

  // 3. The daily loop.
  await page.getByRole("link", { name: "Start lesson" }).click();

  await stepLabel(page, 1, "Review");
  await expect(page.getByText("Nothing is due for review yet.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await stepLabel(page, 2, "New words");
  await expect(page.getByTestId("intro-gloss")).toBeVisible();
  await expect(page.getByText("5 to go")).toBeVisible();
  await answerAll(page, glosses);
  await page.getByRole("button", { name: "Continue" }).click();

  await stepLabel(page, 3, "Grammar");
  await expect(
    page.getByRole("heading", { name: "The article and case: who is what" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Got it, continue" }).click();

  await stepLabel(page, 4, "Read");
  await expect(page.locator('[lang="grc"]').first()).toContainText("Ἐν ἀρχῇ ἦν ὁ λόγος");
  await lookUp(page, "ἀρχῇ");
  await lookUp(page, "φαίνει");
  await page.getByRole("button", { name: "Finish passage" }).click();
  await expect(page.getByText("You looked up 2 words.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await stepLabel(page, 5, "Look closer");
  await expect(page.getByRole("heading", { name: "Spot the forms" })).toBeVisible();
  await expect(page.locator("mark", { hasText: "τὸν" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await stepLabel(page, 6, "Recall");
  await answerAll(page, glosses);
  await page.getByRole("button", { name: "Continue" }).click();

  await stepLabel(page, 7, "Read again");
  await page.getByRole("button", { name: "Finish passage" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Lesson complete" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Today" }).click();

  // 4. Today reflects the session and offers lesson 2.
  await expect(page.getByText(/✓ Lesson 1 done today/)).toBeVisible();
  await expect(page.getByText("Up next · Lesson 2")).toBeVisible();
  const progress = page.getByTestId("progress");
  await expect(progress).toContainText("Words in review6"); // 5 new words + φαίνω looked up
  await expect(progress).toContainText("Passages read1");
  await expect(progress).toContainText("Grammar studied1");
  await expect(progress).toContainText("Lessons done1");
  await expect(page.getByTestId("due-count")).toHaveText("0");
});

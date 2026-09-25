import { expect, type Page, test } from "@playwright/test";
import { answerAll, greekText, lookUp, trackGlosses } from "./helpers";

// The MVP acceptance flow (docs/ACCEPTANCE.md): a brand-new learner onboards, works through
// lesson 1's daily loop end to end, and sees Today and their progress reflect it.

const stepLabel = (page: Page, n: number, name: string) =>
  expect(page.getByText(`Step ${n} of 7: ${name}`)).toBeVisible();

test("MVP acceptance: onboard → daily lesson loop → Today and progress", async ({ page }) => {
  test.setTimeout(180_000);
  const glosses = trackGlosses(page);

  // 1. A new visitor is welcomed and onboarded (no account; the name stays on the device).
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome$/);
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page.getByRole("heading", { name: "Where are you starting from?" })).toBeVisible();
  await page.getByText("Completely new").click();
  await page.getByRole("radio", { name: "15 min" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("First name").fill("Ada");
  const onboarding = page.waitForRequest((r) => r.url().includes("/api/me/onboarding"));
  await page.getByRole("button", { name: "Start learning" }).click();
  expect((await onboarding).postDataJSON()).toEqual({
    experienceLevel: "none",
    dailyMinutes: 15,
  });

  // 2. Today shows lesson 1's four stages, nothing due and nothing read yet.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: /, Ada$/ })).toBeVisible();
  await expect(page.getByText("Today’s session · Lesson 1")).toBeVisible();
  await expect(page.getByText("Building up to John 1:1–5")).toBeVisible();
  await expect(page.getByText("The article and case: who is what")).toBeVisible();
  await expect(page.getByTestId("due-count")).toHaveText("0");
  await expect(page.getByTestId("progress")).toContainText("Greek words read0");
  await expect(page.getByTestId("passage-known")).toHaveText("0 of 61 words known");

  // 3. The daily loop.
  await page.getByRole("link", { name: "Start session" }).click();

  await stepLabel(page, 1, "Review");
  await expect(page.getByText("Nothing is due for review yet.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await stepLabel(page, 2, "New words");
  // A new word's card hides its meaning until it is flipped.
  await expect(page.getByText("Tap to see the meaning")).toBeVisible();
  await page.getByRole("button", { name: "Show the meaning" }).click();
  await expect(page.getByTestId("intro-gloss")).toBeVisible();
  await expect(page.getByText("5 to go")).toBeVisible();
  await answerAll(page, glosses);
  await page.getByRole("button", { name: "Continue" }).click();

  await stepLabel(page, 3, "Grammar");
  await expect(
    page.getByRole("heading", { name: "The article and case: who is what" }),
  ).toBeVisible();
  // The before/after table, then the quick check: pick, Check, see why, continue.
  await expect(page.getByRole("cell", { name: "ὁ λόγος", exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "τὸν θεόν" }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Correct." })).toBeVisible();
  await page.getByRole("button", { name: "Got it, continue" }).click();

  await stepLabel(page, 4, "Read");
  await expect(greekText(page)).toContainText("Ἐν ἀρχῇ ἦν ὁ λόγος");
  await lookUp(page, "ἀρχῇ", { embedded: true });
  await lookUp(page, "φαίνει", { embedded: true });
  await page.getByRole("button", { name: "Finish passage" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "John 1:1–5" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(2); // both go into review
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
  await expect(page.getByText("You didn’t look anything up.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Lesson complete" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Today" }).click();

  // 4. Today reflects the session and offers lesson 2.
  await expect(page.getByText(/Lesson 1 done today/)).toBeVisible();
  await expect(page.getByText("Up next · Lesson 2")).toBeVisible();
  const progress = page.getByTestId("progress");
  await expect(progress).toContainText("Greek words read122"); // John 1:1–5 (61 words) twice
  await expect(progress).toContainText("passages1");
  await expect(progress).toContainText("grammar concepts1");
  await expect(page.getByTestId("due-count")).toHaveText("0");

  // 5. Progress shows real counts from the session (no proficiency percentage).
  await page.getByRole("link", { name: "Progress" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Progress" })).toBeVisible();
  const stats = page.getByTestId("progress-stats");
  await expect(stats).toContainText("Greek words read122");
  await expect(stats).toContainText("passages completed1");
  await expect(stats).toContainText("grammar concepts1");
  await expect(stats).toContainText("days practised1");
  await expect(stats).toContainText("review accuracy100%");
  await expect(page.getByTestId("words-learned")).toHaveText("0"); // none has lasted 21 days yet
  await expect(
    page.getByRole("img", { name: /Activity over the last 14 weeks: 1 active day\./ }),
  ).toBeVisible();
});

import { reviewQueueResponseSchema } from "@gbt/shared";
import { expect, test } from "@playwright/test";
import { answerCard, lookUp, openJohn, trackGlosses } from "./helpers";

// Each test gets a fresh browser context, so a fresh anonymous learner.

test("finishing a passage puts the ticked looked-up words into review", async ({ page }) => {
  await openJohn(page);
  await lookUp(page, "ἀρχῇ");
  await lookUp(page, "λόγος");
  await lookUp(page, "λόγος"); // the same word twice is listed once

  await page.getByRole("button", { name: "Finish passage" }).click();
  await expect(page.getByText("Passage complete")).toBeVisible();
  await expect(page.getByTestId("passage-stats")).toContainText("Greek words read61");
  await expect(page.getByTestId("passage-stats")).toContainText("read without help59");
  await expect(page.getByText("First read-through.")).toBeVisible();

  const logos = page.getByRole("checkbox", { name: "Add λόγος to review" });
  await expect(page.getByRole("checkbox", { name: "Add ἀρχή to review" })).toBeChecked();
  await logos.click();
  await expect(logos).not.toBeChecked();

  const added: string[] = [];
  page.on("request", (r) => r.url().includes("/add") && added.push(r.url()));
  await page.getByRole("button", { name: "Done for today" }).click();
  await expect(page).not.toHaveURL(/\/read\//);
  expect(added).toHaveLength(1);

  // Only the ticked word, ἀρχή, is now due for review.
  const queueResponse = page.waitForResponse((r) => r.url().includes("/api/review/queue"));
  await page.goto("/review");
  const queue = reviewQueueResponseSchema.parse(await (await queueResponse).json());
  expect(queue.dueCount).toBe(1);
  expect(queue.items.filter((i) => i.kind === "due").map((i) => i.lemma.lemma)).toEqual(["ἀρχή"]);
});

test("a missed word resurfaces later in the same session", async ({ page }) => {
  const glosses = trackGlosses(page);
  await page.goto("/review");
  await expect(page.getByText("0/5")).toBeVisible();

  // Every card starts with its introduction for a new learner.
  await expect(page.getByText("New word")).toBeVisible();
  const missed = await answerCard(page, glosses, { correct: false });
  for (let i = 0; i < 3; i++) await answerCard(page, glosses, { ease: "Easy" });

  const card = page.locator("section[data-lemma-id]");
  await expect(card).toHaveAttribute("data-lemma-id", String(missed));
  await expect(page.getByText("You missed this earlier. Try again.")).toBeVisible();
  await answerCard(page, glosses);
  await answerCard(page, glosses);

  await expect(page.getByRole("heading", { name: "Review done" })).toBeVisible();
  await expect(page.getByText("5 words, 4 right first time.")).toBeVisible();
});

test("the answer panel previews when the word comes back for each ease", async ({ page }) => {
  const glosses = trackGlosses(page);
  await page.goto("/review");
  const card = page.locator("section[data-lemma-id]");
  await card.getByRole("button", { name: "Got it", exact: true }).click();
  await expect(page.getByText("What does this mean?")).toBeVisible();
  await expect(card.locator("ul button")).toHaveCount(4);

  const lemmaId = Number(await card.getAttribute("data-lemma-id"));
  await expect.poll(() => glosses.has(lemmaId)).toBe(true);
  await card
    .locator("ul button")
    .filter({ hasText: new RegExp(`^${glosses.get(lemmaId)}$`) })
    .click();
  // A first success: hard and good come back tomorrow, easy in 4 days (SM-2).
  const status = page.locator("#feedback").getByRole("status");
  await expect(status).toContainText("CorrectNext review tomorrow");
  await page.getByRole("radio", { name: "Easy" }).click();
  await expect(status).toContainText("Next review in 4 days");

  const graded = page.waitForRequest((r) => r.url().endsWith(`/api/review/${lemmaId}`));
  await page.getByRole("button", { name: "Continue" }).click();
  expect((await graded).postDataJSON()).toMatchObject({ grade: "easy" });
});

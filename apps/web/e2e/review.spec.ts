import { expect, type Page, test } from "@playwright/test";
import { reviewQueueResponseSchema } from "@gbt/shared";

// Each test gets a fresh browser context, so a fresh anonymous learner.

async function openJohn(page: Page) {
  await page.goto("/read");
  await page.getByRole("link", { name: /John 1:1–5/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "John 1:1–5" })).toBeVisible();
}

async function lookUp(page: Page, word: string) {
  const recorded = page.waitForResponse(
    (r) => r.url().includes("/lookup") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: word, exact: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect((await recorded).status()).toBe(204);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
}

test("finish a passage, then review the words looked up; a miss comes back", async ({ page }) => {
  await openJohn(page);
  await lookUp(page, "ἀρχῇ");
  await lookUp(page, "λόγος");
  await lookUp(page, "λόγος"); // same word twice counts once for the review offer

  await page.getByRole("button", { name: "Finish passage" }).click();
  await expect(page.getByRole("heading", { name: "Passage complete" })).toBeVisible();
  await expect(page.getByText("You looked up 2 words.")).toBeVisible();

  // Option order is shuffled per response (and dev StrictMode fetches twice), so answers are
  // chosen by gloss text, which every response agrees on.
  const queueResponse = page.waitForResponse((r) => r.url().includes("/api/review/queue"));
  await page.getByRole("link", { name: "Review these 2" }).click();
  const queue = reviewQueueResponseSchema.parse(await (await queueResponse).json());
  expect(queue.items.map((i) => [i.lemma.lemma, i.kind])).toEqual([
    ["ἀρχή", "lookedUp"],
    ["λόγος", "lookedUp"],
  ]);
  const [arche, logos] = queue.items;
  await expect(page.getByText("Words you looked up")).toBeVisible();
  await expect(page.getByText("2 to go")).toBeVisible();

  const options = page.locator("main ul button");
  const answer = (gloss: string) => options.filter({ hasText: new RegExp(`^${gloss}$`) });
  const notAnswer = (gloss: string) =>
    options.filter({ hasNotText: new RegExp(`^${gloss}$`) }).first();

  // 1st card (ἀρχή): answer correctly, grade Good.
  await answer(arche!.lemma.gloss).click();
  await expect(page.getByText("Correct. How easy was it?")).toBeVisible();
  await page.getByRole("button", { name: "good" }).click();

  // 2nd card (λόγος): answer wrongly → it is requeued.
  await expect(page.getByText("1 to go")).toBeVisible();
  await notAnswer(logos!.lemma.gloss).click();
  await expect(page.getByText(/Not quite/)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // It resurfaces in the same session.
  await expect(page.getByText("You missed this earlier. Try again.")).toBeVisible();
  await answer(logos!.lemma.gloss).click();
  await page.getByRole("button", { name: "good" }).click();

  await expect(page.getByRole("heading", { name: "Review done" })).toBeVisible();
  await expect(page.getByText("2 words, 1 right first time.")).toBeVisible();
});

test("read again resets the passage for another read-through", async ({ page }) => {
  await openJohn(page);
  await lookUp(page, "θεόν");
  await page.getByRole("button", { name: "Finish passage" }).click();
  await expect(page.getByText("First read-through.")).toBeVisible();

  await page.getByRole("button", { name: "Read again" }).click();
  await expect(page.getByRole("button", { name: "Finish passage" })).toBeVisible();

  await page.getByRole("button", { name: "Finish passage" }).click();
  await expect(page.getByText("Read 2 times.")).toBeVisible();
  await expect(page.getByText("You didn’t look anything up.")).toBeVisible();
});

test("a new learner's review introduces new words from the passage", async ({ page }) => {
  await page.goto("/review");
  await expect(page.getByText("New word")).toBeVisible();
  await expect(page.getByText("5 to go")).toBeVisible();
  await page.getByRole("button", { name: "Got it, test me" }).click();
  await expect(page.getByRole("heading", { name: "What does it mean?" })).toBeVisible();
  await expect(page.locator("main ul button")).toHaveCount(4);
});

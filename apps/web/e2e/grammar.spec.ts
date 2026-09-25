import { expect, test } from "@playwright/test";
import { openJohn, sheet } from "./helpers";

test("a word's “Why this form?” note leads to its grammar lesson, which can be marked studied", async ({
  page,
}) => {
  await openJohn(page);
  await page.getByRole("button", { name: "τὸν", exact: true }).first().click();

  const detail = sheet(page);
  await expect(detail.getByTestId("gloss")).toContainText("the");
  await expect(detail.getByText("Why this form?")).toBeVisible();
  await expect(detail.getByText(/Accusative article/)).toBeVisible();
  await detail.getByRole("link", { name: "The article and case: who is what" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "The article and case: who is what" }),
  ).toBeVisible();
  // Greek in the lesson body and examples is marked as Greek.
  await expect(page.locator('main [lang="grc"]').first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "In the New Testament" })).toBeVisible();
  await expect(page.locator("figcaption", { hasText: "John 3:16" }).first()).toBeVisible();

  // Terminology is deferred: closed for a beginner, open on request.
  const deeper = page.locator("details", { hasText: "Going deeper" });
  await expect(deeper).not.toHaveAttribute("open", "");
  await deeper.locator("summary").click();
  await expect(deeper.getByText(/nominative/).first()).toBeVisible();

  await page.getByRole("button", { name: "Mark as studied" }).click();
  await expect(page.getByText("✓ Studied")).toBeVisible();

  await page.getByRole("link", { name: "Grammar", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Grammar" })).toBeVisible();
  const row = page.getByRole("link", { name: /The article and case/ });
  await expect(row.getByLabel("Studied")).toBeVisible();
});

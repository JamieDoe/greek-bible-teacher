import { expect, test } from "@playwright/test";

test("a new learner's progress page explains itself and points to the first lesson", async ({
  page,
}) => {
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Your progress starts here" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start today’s lesson" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("a missing passage or grammar lesson offers the way back", async ({ page }) => {
  await page.goto("/read/999999");
  await expect(page.getByRole("heading", { level: 1, name: "Passage not found" })).toBeVisible();
  await page.getByRole("link", { name: "See all passages" }).click();
  await expect(page).toHaveURL(/\/read$/);

  await page.goto("/grammar/no-such-lesson");
  await expect(page.getByRole("heading", { level: 1, name: "Lesson not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "See all grammar lessons" })).toBeVisible();
});

import { expect, type Page, test } from "@playwright/test";

async function openJohn(page: Page) {
  await page.goto("/read");
  await page.getByRole("link", { name: /John 1:1–5/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "John 1:1–5" })).toBeVisible();
}

const sheet = (page: Page) => page.getByRole("dialog");
const word = (page: Page, text: string) =>
  page.getByRole("button", { name: text, exact: true }).first();

test.describe("reader", () => {
  test("renders real Greek with verse numbers; punctuation is not a tap target", async ({
    page,
  }) => {
    await openJohn(page);
    const greek = page.locator('[lang="grc"]').first();
    await expect(greek).toContainText("Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν");
    await expect(page.getByText("Verse 5")).toBeAttached();
    await expect(page.getByRole("button", { name: "λόγος," })).toHaveCount(0);
    await expect(word(page, "λόγος")).toBeVisible();
  });

  test("uses the self-hosted Greek font and composes combining diacritics", async ({ page }) => {
    await openJohn(page);
    const result = await page.evaluate(async () => {
      await document.fonts.ready;
      const el = document.querySelector('[lang="grc"]')!;
      const family = getComputedStyle(el).fontFamily.split(",")[0]!.trim().replace(/['"]/g, "");
      const loaded = [...document.fonts].some(
        (f) => f.family.replace(/['"]/g, "") === family && f.status === "loaded",
      );
      // A font that positions combining marks renders decomposed text at the same width as
      // the precomposed form; one that doesn't advances past each mark.
      const ctx = document.createElement("canvas").getContext("2d")!;
      ctx.font = `48px "${family}"`;
      const samples = ["ἀρχῇ", "ὃ", "αὐτῷ", "σκοτίᾳ", "ἦν"];
      const deltas = samples.map((s) =>
        Math.abs(
          ctx.measureText(s.normalize("NFD")).width - ctx.measureText(s.normalize("NFC")).width,
        ),
      );
      return { family, loaded, maxDelta: Math.max(...deltas) };
    });
    expect(result.family).toMatch(/gentium/i);
    expect(result.loaded).toBe(true);
    expect(result.maxDelta).toBeLessThan(0.5);
  });

  test("tap → panel → Esc returns focus to the word without moving the page", async ({ page }) => {
    await openJohn(page);
    const logos = word(page, "λόγος");
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await logos.click();
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).getByRole("heading", { name: "λόγος" })).toBeVisible();
    await expect(sheet(page).getByTestId("gloss")).toContainText("word");

    await page.keyboard.press("Escape");
    await expect(sheet(page)).toBeHidden();
    await expect(logos).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  });

  test("tapping outside the panel dismisses it", async ({ page }) => {
    await openJohn(page);
    await word(page, "θεόν").click();
    await expect(sheet(page)).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(sheet(page)).toBeHidden();
    await expect(word(page, "θεόν")).toBeFocused();
  });

  test("swiping the panel down dismisses it", async ({ page }) => {
    await openJohn(page);
    await word(page, "ἀρχῇ").click();
    const handle = sheet(page).locator(".cursor-grab");
    const box = (await handle.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 60, { steps: 4 });
    await page.mouse.move(x, y + 160, { steps: 4 });
    await page.mouse.up();
    await expect(sheet(page)).toBeHidden();
  });

  test("progressive disclosure is remembered for the user", async ({ page }) => {
    await openJohn(page);
    await word(page, "ἀρχῇ").click();
    await sheet(page).getByText("Simple", { exact: true }).click();
    await expect(sheet(page).getByText("Noun · Dative · Singular · Feminine")).toBeHidden();

    const saved = page.waitForResponse(
      (r) => r.url().includes("/api/me/preferences") && r.request().method() === "PATCH",
    );
    await sheet(page).getByText("More", { exact: true }).click();
    expect((await saved).ok()).toBe(true);
    await expect(sheet(page).getByText("Noun · Dative · Singular · Feminine")).toBeVisible();
    await expect(sheet(page).getByText("Parse code")).toBeHidden();

    await page.reload();
    await word(page, "ἀρχῇ").click();
    await expect(sheet(page).getByRole("radio", { name: "More" })).toBeChecked();

    await sheet(page).getByText("Full", { exact: true }).click();
    await expect(sheet(page).getByText("N- ----DSF-")).toBeVisible();
    await expect(sheet(page).getByText(/In the NT: \d+ times/)).toBeVisible();
  });
});

import { expect, type Page, test } from "@playwright/test";
import { greekText, openJohn, sheet } from "./helpers";

const word = (page: Page, text: string) =>
  page.getByRole("button", { name: text, exact: true }).first();

test.describe("reader", () => {
  test("renders real Greek with verse numbers; punctuation is not a tap target", async ({
    page,
  }) => {
    await openJohn(page);
    await expect(greekText(page)).toContainText("Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν");
    await expect(page.getByText("Verse 5")).toBeAttached();
    await expect(page.getByRole("button", { name: "λόγος," })).toHaveCount(0);
    await expect(word(page, "λόγος")).toBeVisible();
  });

  test("renders every Greek glyph, diacritics included, from the self-hosted font", async ({
    page,
  }) => {
    await openJohn(page);
    const result = await page.evaluate(async () => {
      await document.fonts.ready;
      const el = document.querySelector('article [lang="grc"]')!;
      const family = getComputedStyle(el).fontFamily.split(",")[0]!.trim().replace(/['"]/g, "");
      const loaded = [...document.fonts].some(
        (f) => f.family.replace(/['"]/g, "") === family && f.status === "loaded",
      );
      // Measure the same text with two different fallbacks behind the font: equal widths mean
      // no character fell back, i.e. the font covers every letter and mark. Checked for the
      // passage itself, precomposed polytonic forms, and each combining mark on its own
      // (breathings, accents, diaeresis, iota subscript). The app only renders NFC text (the
      // ingest normalises it); whole NFD clusters are shaped differently by Chromium on Linux
      // and macOS, so they are not compared as strings.
      const ctx = document.createElement("canvas").getContext("2d")!;
      const width = (fallback: string, text: string) => {
        ctx.font = `48px "${family}", ${fallback}`;
        return ctx.measureText(text).width;
      };
      const passage = el.textContent ?? "";
      const marks = ["\u0300", "\u0301", "\u0308", "\u0313", "\u0314", "\u0342", "\u0345"];
      const samples = [passage, "ἀρχῇ ᾧ ὢν Ἐν ῥῆμα Μωϋσῆς ἐλήλυθεν", ...marks];
      const gaps = samples.map((t) => Math.abs(width("monospace", t) - width("serif", t)));
      return { family, loaded, passageLength: passage.length, maxGap: Math.max(...gaps) };
    });
    expect(result.family).toMatch(/literata/i);
    expect(result.loaded).toBe(true);
    expect(result.passageLength).toBeGreaterThan(300);
    expect(result.maxGap).toBe(0);
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
    const handle = sheet(page).locator('[data-slot="drawer-handle"]');
    // Measure after the slide-in animation, or the handle is still moving.
    await sheet(page).evaluate((el) =>
      Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)),
    );
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
    const parsing = sheet(page).getByRole("list", { name: "Parsing" });
    await sheet(page).getByRole("radio", { name: "Simple" }).click();
    await expect(parsing).toBeHidden();

    const saved = page.waitForResponse(
      (r) => r.url().includes("/api/me/preferences") && r.request().method() === "PATCH",
    );
    await sheet(page).getByRole("radio", { name: "More" }).click();
    expect((await saved).ok()).toBe(true);
    await expect(parsing.getByRole("listitem")).toHaveText([
      "Noun",
      "Dative",
      "Singular",
      "Feminine",
    ]);
    await expect(sheet(page).getByText("Parse code")).toBeHidden();

    await page.reload();
    await word(page, "ἀρχῇ").click();
    await expect(sheet(page).getByRole("radio", { name: "More" })).toBeChecked();

    await sheet(page).getByRole("radio", { name: "Full" }).click();
    await expect(sheet(page).getByText("N- ----DSF-")).toBeVisible();
    await expect(sheet(page).getByText(/In the NT: \d+ times/)).toBeVisible();
  });

  test("words not yet in review are marked as new; the sheet can add one", async ({ page }) => {
    await openJohn(page);
    await expect(word(page, "λόγος")).toHaveAttribute("data-new", "true");
    await word(page, "λόγος").click();
    const added = page.waitForResponse((r) => /\/api\/review\/\d+\/add$/.test(r.url()));
    await sheet(page).getByRole("button", { name: "Add to review" }).click();
    expect((await added).ok()).toBe(true);
    await expect(sheet(page).getByRole("button", { name: "In review" })).toBeDisabled();
    await sheet(page).getByRole("button", { name: "Back to text" }).click();
    await expect(sheet(page)).toBeHidden();
    await page.reload();
    await expect(word(page, "λόγος")).not.toHaveAttribute("data-new", /.*/);
    await expect(word(page, "θεόν")).toHaveAttribute("data-new", "true");
  });

  test("Greek text size is adjustable and remembered on the device", async ({ page }) => {
    await openJohn(page);
    const size = () => greekText(page).evaluate((el) => getComputedStyle(el).fontSize);
    expect(await size()).toBe("21px");
    await page.getByRole("button", { name: "Text size" }).click();
    const slider = page.getByRole("slider", { name: "Greek text size" });
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(size).toBe("24px");
    await page.keyboard.press("Escape");
    await page.reload();
    await expect.poll(size).toBe("24px");
  });
});

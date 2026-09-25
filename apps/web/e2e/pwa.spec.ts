import { expect, type Page, test } from "@playwright/test";
import { greekText } from "./helpers";

const cachedPages = (page: Page) =>
  page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith("pages-")) continue;
      for (const req of await (await caches.open(name)).keys())
        paths.push(new URL(req.url).pathname);
    }
    return paths;
  });

test("is installable: manifest and icons are served", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({
    name: "Greek Bible Teacher",
    display: "standalone",
    start_url: "/",
  });
  const purposes = manifest.icons.map((i: { purpose: string }) => i.purpose);
  expect(purposes).toContain("maskable");
  for (const icon of manifest.icons) {
    const img = await request.get(icon.src);
    expect(img.ok(), icon.src).toBe(true);
    expect(img.headers()["content-type"]).toBe("image/png");
  }
  const sw = await request.get("/sw.js");
  expect(sw.headers()["cache-control"]).toContain("no-cache");
});

test("a passage read online can be read again offline", async ({ page, context }) => {
  await page.goto("/read");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  // Open the passage by tapping its link (a client-side navigation), look up a word.
  await page.getByRole("link", { name: /John 1:1–5/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "John 1:1–5" })).toBeVisible();
  await page.getByRole("button", { name: "λόγος", exact: true }).first().click();
  await expect(page.getByRole("dialog").getByTestId("gloss")).toContainText("word");
  await page.keyboard.press("Escape");
  await expect.poll(() => cachedPages(page)).toContain("/read/1");

  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText("You’re offline. Passages you’ve read recently are still available."),
  ).toBeVisible();
  await expect(greekText(page)).toContainText("Ἐν ἀρχῇ ἦν ὁ λόγος");
  await page.getByRole("button", { name: "λόγος", exact: true }).first().click();
  await expect(page.getByRole("dialog").getByTestId("gloss")).toContainText("word");
  await page.keyboard.press("Escape");

  // A page never visited falls back to the offline page, which lists what is saved.
  await page.goto("/grammar/dative");
  await expect(page.getByRole("heading", { name: "You’re offline" })).toBeVisible();
  await expect(page.getByRole("link", { name: "John 1:1–5" })).toBeVisible();
  await context.setOffline(false);
});

test("a recording heard online plays again offline", async ({ page, context }) => {
  // Play silently: resolve at once and report the end shortly after.
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      setTimeout(() => this.dispatchEvent(new Event("ended")), 100);
      return Promise.resolve();
    };
  });
  await page.goto("/read");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await page.getByRole("link", { name: /John 1:1–5/ }).click();
  await page.getByRole("button", { name: "λόγος", exact: true }).first().click();
  const hear = page.getByRole("button", { name: "Hear λόγος (Modern Greek voice)" });
  const online = page.waitForResponse((r) => /\/audio\/[0-9a-f]{16}\.mp3$/.test(r.url()));
  await hear.click();
  expect((await online).ok()).toBe(true);

  await context.setOffline(true);
  const offline = page.waitForResponse((r) => /\/audio\/[0-9a-f]{16}\.mp3$/.test(r.url()));
  await hear.click();
  const response = await offline;
  expect(response.ok()).toBe(true);
  expect(response.fromServiceWorker()).toBe(true);
  await context.setOffline(false);
});

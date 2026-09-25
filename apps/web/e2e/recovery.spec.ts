import { sessionResponseSchema } from "@gbt/shared";
import { type Browser, expect, type Page, test } from "@playwright/test";

// Two separate browsers (contexts, so separate cookies): progress made in one is carried to
// the other with a recovery code.

/**
 * A browser with its own cookies and its own client address. Failed restores are limited per
 * IP in every environment (DECISIONS 027), and every local run shares one address, so each
 * browser sends a distinct X-Forwarded-For; locally there is no proxy to overwrite it.
 */
async function newBrowser(browser: Browser) {
  const ip = `10.${rand()}.${rand()}.${rand()}`;
  const context = await browser.newContext({ extraHTTPHeaders: { "X-Forwarded-For": ip } });
  return context.newPage();
}
const rand = () => Math.floor(Math.random() * 254) + 1;

/** A new browser with an onboarded learner, set up through the API for speed. */
async function learnerIn(browser: Browser) {
  const page = await newBrowser(browser);
  await page.request.post("/api/session/anonymous");
  await page.request.post("/api/me/onboarding", {
    data: { experienceLevel: "beginner", dailyMinutes: 15 },
  });
  return page;
}

const sessionOf = async (page: Page) =>
  sessionResponseSchema.parse(await (await page.request.post("/api/session/anonymous")).json());

async function makeCode(page: Page) {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Make a recovery code" }).click();
  const code = (await page.getByTestId("recovery-code").textContent())!;
  expect(code).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/);
  await page.getByRole("button", { name: "I’ve saved it" }).click();
  await expect(page.getByText(/You made a recovery code on/)).toBeVisible();
  return code;
}

test("a recovery code carries progress to another browser, and can be replaced", async ({
  browser,
}) => {
  const a = await learnerIn(browser);
  const code = await makeCode(a);

  // Browser B is a first-time visitor: Welcome → Restore.
  const b = await newBrowser(browser);
  await b.goto("/welcome");
  await b.getByRole("link", { name: "Restore progress from another device" }).click();
  await expect(b.getByRole("heading", { name: "Restore your progress" })).toBeVisible();

  const input = b.getByLabel("Recovery code");
  await input.fill("0000-0000-0000-0000");
  await b.getByRole("button", { name: "Restore progress" }).click();
  await expect(b.getByRole("main").getByRole("alert")).toContainText(
    "doesn’t match any saved progress",
  );

  // Typed casually: lower case, spaces instead of hyphens.
  await input.fill(code.toLowerCase().replaceAll("-", " "));
  await b.getByRole("button", { name: "Restore progress" }).click();
  // Back on Today as the onboarded learner, not sent to Welcome.
  await expect(b.getByText(/Today’s session · Lesson 1/)).toBeVisible();
  expect((await sessionOf(b)).user).toMatchObject({ onboarded: true, dailyMinutes: 15 });

  // A replaces the code; the old one stops working.
  await a.goto("/settings");
  await a.getByRole("button", { name: "Make a new code" }).click();
  const dialog = a.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: "Replace your recovery code?" })).toBeVisible();
  await dialog.getByRole("button", { name: "Replace it" }).click();
  const replacement = (await a.getByTestId("recovery-code").textContent())!;
  expect(replacement).not.toBe(code);

  const c = await newBrowser(browser);
  await c.goto("/restore");
  await c.getByLabel("Recovery code").fill(code);
  await c.getByRole("button", { name: "Restore progress" }).click();
  await expect(c.getByRole("main").getByRole("alert")).toContainText(
    "doesn’t match any saved progress",
  );
  await c.getByLabel("Recovery code").fill(replacement);
  await c.getByRole("button", { name: "Restore progress" }).click();
  await expect(c.getByText(/Today’s session · Lesson 1/)).toBeVisible();
});

test("cancelling the replace dialog keeps the code", async ({ browser }) => {
  const a = await learnerIn(browser);
  await makeCode(a);
  await a.getByRole("button", { name: "Make a new code" }).click();
  await a.getByRole("alertdialog").getByRole("button", { name: "Keep the old code" }).click();
  await expect(a.getByRole("alertdialog")).toBeHidden();
  await expect(a.getByTestId("recovery-code")).toHaveCount(0);
  await expect(a.getByRole("button", { name: "Make a new code" })).toBeFocused();
});

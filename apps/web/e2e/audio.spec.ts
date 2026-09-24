import { expect, type Page, test } from "@playwright/test";

// Headless Chromium has no Greek voice, so each test stubs the Web Speech API: `voices`
// decides what the device offers, and everything spoken is recorded on window.__spoken.
async function stubSpeech(page: Page, voices: { name: string; lang: string }[]) {
  await page.addInitScript((list) => {
    const spoken: { text: string; lang: string; rate: number }[] = [];
    Object.assign(window, { __spoken: spoken });
    class FakeUtterance {
      text: string;
      lang = "";
      rate = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.assign(window, { SpeechSynthesisUtterance: FakeUtterance });
    const synth = window.speechSynthesis;
    synth.getVoices = () =>
      list.map((v) => ({ ...v, localService: true, default: false, voiceURI: v.name })) as never;
    synth.speak = (u) => {
      const utterance = u as unknown as FakeUtterance;
      spoken.push({ text: utterance.text, lang: utterance.lang, rate: utterance.rate });
      setTimeout(() => utterance.onend?.(), 300);
    };
    synth.cancel = () => {};
  }, voices);
}

const spoken = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __spoken: { text: string; lang: string; rate: number }[] }).__spoken,
  );

async function openJohn(page: Page) {
  await page.goto("/read");
  await page.getByRole("link", { name: /John 1:1–5/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "John 1:1–5" })).toBeVisible();
}

test("a tapped word can be heard, in monotonic spelling, with the Greek voice", async ({
  page,
}) => {
  await stubSpeech(page, [
    { name: "Samantha", lang: "en-US" },
    { name: "Melina", lang: "el-GR" },
  ]);
  await openJohn(page);
  await page.getByRole("button", { name: "ἀρχῇ", exact: true }).first().click();
  await page.getByRole("button", { name: "Hear ἀρχῇ (Modern Greek voice)" }).click();
  await expect.poll(() => spoken(page)).toEqual([{ text: "αρχή", lang: "el-GR", rate: 0.8 }]);
});

test("the whole passage can be played and stopped, labelled as a Modern Greek voice", async ({
  page,
}) => {
  await stubSpeech(page, [{ name: "Melina", lang: "el-GR" }]);
  await openJohn(page);
  await expect(page.getByText("Modern Greek voice ·")).toBeVisible();
  const listen = page.getByRole("button", { name: "Listen" });
  await listen.click();
  await expect(page.getByRole("button", { name: "Stop" })).toHaveAttribute("aria-pressed", "true");
  const [first] = await spoken(page);
  expect(first?.text.startsWith("Εν αρχή ήν ο λόγος, καί ο λόγος")).toBe(true);
  // When the voice finishes, the control returns to Listen.
  await expect(page.getByRole("button", { name: "Listen" })).toBeVisible();
});

test("no speaker buttons appear when the device has no Greek voice", async ({ page }) => {
  await stubSpeech(page, [{ name: "Samantha", lang: "en-US" }]);
  await openJohn(page);
  await expect(page.getByRole("button", { name: "Listen" })).toHaveCount(0);
  await page.getByRole("button", { name: "λόγος", exact: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: /Modern Greek voice/ })).toHaveCount(0);
});

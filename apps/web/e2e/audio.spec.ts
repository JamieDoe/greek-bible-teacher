import { readFileSync } from "node:fs";
import { audioManifestSchema, spokenWordKey } from "@gbt/shared";
import { expect, type Page, test } from "@playwright/test";
import { expectWordOpen, openJohn } from "./helpers";

// The recordings shipped with the app (pnpm audio:generate).
const manifest = audioManifestSchema.parse(
  JSON.parse(readFileSync(new URL("../public/audio/manifest.json", import.meta.url), "utf8")),
);

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

/** Plays recordings silently: play() resolves at once and "ended" fires shortly after. */
async function stubPlayback(page: Page) {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      setTimeout(() => this.dispatchEvent(new Event("ended")), 200);
      return Promise.resolve();
    };
  });
}

/** The recordings the page fetched, in order, as manifest file names. */
function audioRequests(page: Page) {
  const files: string[] = [];
  page.on("request", (r) => {
    const m = /\/audio\/([0-9a-f]{16}\.mp3)$/.exec(new URL(r.url()).pathname);
    if (m) files.push(m[1]!);
  });
  return files;
}

const withoutRecordings = (page: Page) =>
  page.route("**/audio/manifest.json", (route) => route.fulfill({ status: 404 }));

test.describe("with recordings", () => {
  test("a tapped word plays its recording, even with no device Greek voice", async ({ page }) => {
    await stubSpeech(page, [{ name: "Samantha", lang: "en-US" }]);
    await stubPlayback(page);
    const fetched = audioRequests(page);
    await openJohn(page);
    await page.getByRole("button", { name: "ἀρχῇ", exact: true }).first().click();
    await page.getByRole("button", { name: "Hear ἀρχῇ (Modern Greek voice)" }).click();
    await expect.poll(() => fetched).toEqual([manifest.words[spokenWordKey("ἀρχῇ")]]);
    expect(await spoken(page)).toEqual([]);
  });

  test("Listen plays the passage's recorded verses in order, and can be stopped", async ({
    page,
  }) => {
    await stubSpeech(page, []);
    await stubPlayback(page);
    const fetched = audioRequests(page);
    await openJohn(page);
    await expect(page.getByText("Modern Greek voice ·")).toBeVisible();
    await page.getByRole("button", { name: "Listen" }).click();
    await expect(page.getByRole("button", { name: "Stop" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const verses = ["JHN 1:1", "JHN 1:2", "JHN 1:3", "JHN 1:4", "JHN 1:5"];
    await expect.poll(() => fetched).toEqual(verses.map((ref) => manifest.verses[ref]));
    await expect(page.getByRole("button", { name: "Listen" })).toBeVisible();

    // Stopping part-way ends playback without playing the rest.
    await page.getByRole("button", { name: "Listen" }).click();
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByRole("button", { name: "Listen" })).toBeVisible();
    await page.waitForTimeout(600);
    expect(fetched.length).toBeLessThan(verses.length * 2);
  });

  test("every word and verse of John 1:1–5 has a recording", () => {
    for (const ref of ["JHN 1:1", "JHN 1:2", "JHN 1:3", "JHN 1:4", "JHN 1:5"]) {
      expect(manifest.verses[ref], ref).toBeTruthy();
    }
    for (const word of ["Ἐν", "ἀρχῇ", "ἦν", "λόγος", "θεόν", "φαίνει", "σκοτίᾳ", "ἀρχή"]) {
      expect(manifest.words[spokenWordKey(word)], word).toBeTruthy();
    }
  });
});

test.describe("without recordings (device voice)", () => {
  test("a tapped word is spoken in monotonic spelling with the Greek voice", async ({ page }) => {
    await withoutRecordings(page);
    await stubSpeech(page, [
      { name: "Samantha", lang: "en-US" },
      { name: "Melina", lang: "el-GR" },
    ]);
    await openJohn(page);
    await page.getByRole("button", { name: "ἀρχῇ", exact: true }).first().click();
    await page.getByRole("button", { name: "Hear ἀρχῇ (Modern Greek voice)" }).click();
    await expect.poll(() => spoken(page)).toEqual([{ text: "αρχή", lang: "el-GR", rate: 0.8 }]);
  });

  test("Listen speaks the passage verse by verse", async ({ page }) => {
    await withoutRecordings(page);
    await stubSpeech(page, [{ name: "Melina", lang: "el-GR" }]);
    await openJohn(page);
    await page.getByRole("button", { name: "Listen" }).click();
    await expect(page.getByRole("button", { name: "Stop" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect.poll(() => spoken(page).then((s) => s.length)).toBe(5);
    const [first] = await spoken(page);
    expect(first?.text.startsWith("Εν αρχή ήν ο λόγος, καί ο λόγος")).toBe(true);
    await expect(page.getByRole("button", { name: "Listen" })).toBeVisible();
  });

  test("no speaker buttons appear when there is no recording and no Greek voice", async ({
    page,
  }) => {
    await withoutRecordings(page);
    await stubSpeech(page, [{ name: "Samantha", lang: "en-US" }]);
    await openJohn(page);
    await expect(page.getByRole("button", { name: "Listen" })).toHaveCount(0);
    await page.getByRole("button", { name: "λόγος", exact: true }).first().click();
    await expectWordOpen(page);
    await expect(page.getByRole("button", { name: /Modern Greek voice/ })).toHaveCount(0);
  });
});

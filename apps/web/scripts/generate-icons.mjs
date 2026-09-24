// Renders the app icons with the self-hosted Gentium font using Playwright's Chromium, so
// the PNGs are reproducible without image tooling: `node scripts/generate-icons.mjs`.
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const font = readFileSync(new URL("../src/app/fonts/Gentium-SemiBold.woff2", import.meta.url));
const fontUrl = `data:font/woff2;base64,${font.toString("base64")}`;

const PAPER = "#f6f2ea";
const ACCENT = "#8b4a2b";

/** `inset` is the glyph box as a share of the icon; maskable icons keep to the 80% safe zone. */
const icons = [
  { file: "public/icons/icon-192.png", size: 192, radius: 0.22, glyph: 0.72 },
  { file: "public/icons/icon-512.png", size: 512, radius: 0.22, glyph: 0.72 },
  { file: "public/icons/maskable-512.png", size: 512, radius: 0, glyph: 0.56 },
  { file: "src/app/apple-icon.png", size: 180, radius: 0, glyph: 0.66 },
  { file: "src/app/icon.png", size: 64, radius: 0.22, glyph: 0.78 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const icon of icons) {
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: G; src: url(${fontUrl}) format("woff2"); font-weight: 600; }
    html, body { margin: 0; background: transparent; }
    div { width: ${icon.size}px; height: ${icon.size}px; background: ${PAPER};
      border-radius: ${icon.radius * icon.size}px; display: flex; align-items: center;
      justify-content: center; font-family: G; font-weight: 600; color: ${ACCENT};
      font-size: ${icon.size * icon.glyph}px; line-height: 1; }
    span { transform: translateY(-4%); }
  </style></head><body><div><span>λ</span></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: icon.file, omitBackground: true });
  console.log(`[icons] ${icon.file}`);
}
await browser.close();

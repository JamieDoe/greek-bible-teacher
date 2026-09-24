// Per-device display preferences (theme, Greek text size, first name). They live only in this
// browser: the name in particular is never sent to the server (DECISIONS 022).

export type ThemePreference = "system" | "light" | "dark";

export const PREF_KEYS = {
  theme: "koine-theme",
  greekSize: "koine-greek-size",
  name: "koine-name",
} as const;

/** Greek reading sizes offered by the Aa control, in px (the design's 21–27 range and around it). */
export const GREEK_SIZES = [18, 21, 24, 27, 30] as const;
export const DEFAULT_GREEK_SIZE = 21;

/**
 * Applies theme and Greek size to <html>. Kept dependency-free: it is also inlined into the
 * page head (as a string) so it runs before first paint.
 */
export function applyPreferences() {
  try {
    const root = document.documentElement;
    const theme = localStorage.getItem("koine-theme");
    const dark =
      theme === "dark" ||
      (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    const size = Number(localStorage.getItem("koine-greek-size"));
    if (size >= 14 && size <= 40) root.style.setProperty("--greek-size", `${size}px`);
  } catch {
    // Storage can be unavailable (private mode); defaults apply.
  }
}

export function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Ignore: preferences are conveniences.
  }
  applyPreferences();
}

"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_GREEK_SIZE,
  PREF_KEYS,
  readPreference,
  type ThemePreference,
  writePreference,
} from "@/lib/preferences";

// Device preferences in localStorage, shared across components through one tiny store.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function usePreference(key: string, fallback: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => readPreference(key) ?? fallback,
    () => fallback,
  );
  const set = useCallback(
    (next: string | null) => {
      writePreference(key, next);
      notify();
    },
    [key],
  );
  return [value, set] as const;
}

export function useTheme() {
  const [theme, setTheme] = usePreference(PREF_KEYS.theme, "system");
  return [
    theme as ThemePreference,
    (t: ThemePreference) => setTheme(t === "system" ? null : t),
  ] as const;
}

export function useGreekSize() {
  const [size, setSize] = usePreference(PREF_KEYS.greekSize, String(DEFAULT_GREEK_SIZE));
  return [Number(size) || DEFAULT_GREEK_SIZE, (px: number) => setSize(String(px))] as const;
}

/** The learner's first name, kept on this device only and never sent to the server. */
export function useLocalName() {
  const [name, setName] = usePreference(PREF_KEYS.name, "");
  return [name, (n: string) => setName(n.trim() ? n.trim().slice(0, 40) : null)] as const;
}

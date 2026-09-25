import { IngestError } from "./errors";

export interface DodsonEntry {
  /** Brief English gloss. */
  brief: string;
  /** Longer English definition. */
  full: string;
}

const ENTRY =
  /<entry n="([^"|]+) \| (\d+)">\s*<orth>[^<]*<\/orth>\s*<def role="brief">([^<]*)<\/def>\s*<def role="full">([^<]*)<\/def>\s*<\/entry>/g;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Parses Dodson's lexicon (TEI XML, biblicalhumanities edition) into a map from NFC headword to
 * entry. Homographs (a few headwords appear twice) are merged, joining their senses with "; ".
 */
export function parseDodson(xml: string): Map<string, DodsonEntry> {
  if (/&[a-zA-Z#0-9]+;/.test(xml)) {
    // The pinned file has none; handle entities properly if a new version introduces them.
    throw new IngestError("dodson.xml: XML entities are not supported by this parser");
  }
  const expected = xml.match(/<entry\b/g)?.length ?? 0;
  const byHeadword = new Map<string, DodsonEntry[]>();
  let parsed = 0;
  for (const m of xml.matchAll(ENTRY)) {
    parsed++;
    const [, head, , brief, full] = m as unknown as [string, string, string, string, string];
    const key = head.trim().normalize("NFC");
    const entry = { brief: clean(brief), full: clean(full) };
    if (!entry.brief) throw new IngestError(`dodson.xml: empty brief gloss for "${key}"`);
    byHeadword.set(key, [...(byHeadword.get(key) ?? []), entry]);
  }
  if (parsed === 0 || parsed !== expected) {
    throw new IngestError(`dodson.xml: parsed ${parsed} of ${expected} entries; format changed?`);
  }

  const result = new Map<string, DodsonEntry>();
  for (const [key, entries] of byHeadword) {
    result.set(key, {
      brief: entries.map((e) => e.brief).join("; "),
      full: entries.map((e) => e.full).join(" / "),
    });
  }
  return result;
}

const stripDiaeresis = (s: string) => s.normalize("NFD").replace(/̈/g, "").normalize("NFC");

/**
 * Finds the Dodson entry for a MorphGNT lemma. Only spelling-level fallbacks are tried, never
 * meaning-level ones (e.g. `-ομαι` → `-ω` is not attempted):
 * 1. exact NFC match;
 * 2. optional final letters written in brackets, `οὕτω(ς)` → `οὕτως`, then `οὕτω`;
 * 3. diaeresis-insensitive match (`Μωϋσῆς` ↔ `Μωυσῆς`), only when unambiguous.
 */
export function createGlossLookup(lexicon: Map<string, DodsonEntry>) {
  const withoutDiaeresis = new Map<string, DodsonEntry | null>();
  for (const [key, entry] of lexicon) {
    const k = stripDiaeresis(key);
    withoutDiaeresis.set(k, withoutDiaeresis.has(k) ? null : entry); // null marks ambiguity
  }

  return (lemma: string): DodsonEntry | undefined => {
    const exact = lexicon.get(lemma);
    if (exact) return exact;

    const bracket = /^(.*)\(([^()]+)\)$/.exec(lemma);
    if (bracket) {
      const [, stem, optional] = bracket as unknown as [string, string, string];
      const found = lexicon.get(stem + optional) ?? lexicon.get(stem);
      if (found) return found;
    }

    return withoutDiaeresis.get(stripDiaeresis(lemma)) ?? undefined;
  };
}

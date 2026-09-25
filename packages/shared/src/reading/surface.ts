// SBLGNT text-critical sigla that mark apparatus entries (e.g. ⸀, ⸂…⸃). Without the apparatus
// they mean nothing to a reader, so the reader hides them; the DB keeps the raw surface.
const APPARATUS_SIGLA = /[⸀⸁⸂⸃⸄⸅]\d?/g;

/**
 * Splits a token's surface text around its word, giving the punctuation to show before and
 * after it (with apparatus sigla removed). Falls back to no punctuation if the word is not
 * found in the surface, which does not happen in the pinned data.
 */
export function splitSurface(surface: string, word: string): { before: string; after: string } {
  const index = surface.indexOf(word);
  if (index < 0) return { before: "", after: "" };
  return {
    before: surface.slice(0, index).replace(APPARATUS_SIGLA, ""),
    after: surface.slice(index + word.length).replace(APPARATUS_SIGLA, ""),
  };
}

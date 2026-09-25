/** Clause punctuation that ends a sense line: , . ; : and the Greek raised dot and question mark. */
const LINE_END = /[,.;:··;]/;

export interface SenseLine<V, T> {
  verse: V;
  /** The verse's first line carries its number. */
  first: boolean;
  tokens: T[];
}

/**
 * Breaks verses into phrase lines ("sense lines") for reading: a new line after clause
 * punctuation, and each verse starts a line. John 1:1 becomes Ἐν ἀρχῇ ἦν ὁ λόγος, / καὶ ὁ λόγος
 * ἦν πρὸς τὸν θεόν, / καὶ θεὸς ἦν ὁ λόγος.
 */
export function senseLines<V extends { tokens: readonly { after: string }[] }>(
  verses: readonly V[],
): SenseLine<V, V["tokens"][number]>[] {
  type T = V["tokens"][number];
  const lines: SenseLine<V, T>[] = [];
  for (const verse of verses) {
    let current: T[] = [];
    for (const token of verse.tokens) {
      current.push(token);
      if (LINE_END.test(token.after)) {
        lines.push({ verse, first: !lines.some((l) => l.verse === verse), tokens: current });
        current = [];
      }
    }
    if (current.length > 0) {
      lines.push({ verse, first: !lines.some((l) => l.verse === verse), tokens: current });
    }
  }
  return lines;
}

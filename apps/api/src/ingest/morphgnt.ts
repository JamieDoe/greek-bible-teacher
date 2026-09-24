import { decodeMorphology, MorphologyDecodeError } from "@gbt/shared";
import { IngestError } from "./errors";

/**
 * One MorphGNT token. Column meanings follow the sblgnt README:
 * reference, part of speech, parsing code, text (with punctuation), word (punctuation stripped),
 * normalised word, lemma. All Greek fields are NFC-normalised.
 */
export interface MorphgntToken {
  book: number;
  chapter: number;
  verse: number;
  /** 1-based position within the verse, in file order. */
  position: number;
  posCode: string;
  parseCode: string;
  surface: string;
  word: string;
  normalized: string;
  lemma: string;
}

const nfc = (s: string) => s.normalize("NFC");

/** Parses one line (without the newline). `where` is used in error messages, e.g. `64-Jn:12`. */
export function parseMorphgntLine(line: string, where: string): Omit<MorphgntToken, "position"> {
  const fields = line.split(" ");
  if (fields.length !== 7) {
    throw new IngestError(`${where}: expected 7 space-separated fields, got ${fields.length}`);
  }
  const [ref, posCode, parseCode, surface, word, normalized, lemma] = fields as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (fields.some((f) => f === "")) throw new IngestError(`${where}: empty field`);

  const refMatch = /^(\d{2})(\d{2})(\d{2})$/.exec(ref);
  if (!refMatch) throw new IngestError(`${where}: malformed reference "${ref}"`);
  const [book, chapter, verse] = refMatch.slice(1).map(Number) as [number, number, number];
  if (book < 1 || book > 27 || chapter < 1 || verse < 1) {
    throw new IngestError(`${where}: reference "${ref}" out of range`);
  }

  try {
    decodeMorphology(posCode, parseCode);
  } catch (err) {
    if (err instanceof MorphologyDecodeError) throw new IngestError(`${where}: ${err.message}`);
    throw err;
  }

  return {
    book,
    chapter,
    verse,
    posCode,
    parseCode,
    surface: nfc(surface),
    word: nfc(word),
    normalized: nfc(normalized),
    lemma: nfc(lemma),
  };
}

/**
 * Parses a whole book file, checking every line belongs to `expectedBook` and that verses appear
 * in order. Assigns each token its position within the verse.
 */
export function parseMorphgntFile(
  text: string,
  fileLabel: string,
  expectedBook: number,
): MorphgntToken[] {
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop(); // trailing newline
  if (lines.length === 0) throw new IngestError(`${fileLabel}: file is empty`);

  const tokens: MorphgntToken[] = [];
  let prevKey = -1;
  let position = 0;
  lines.forEach((line, i) => {
    const where = `${fileLabel}:${i + 1}`;
    const parsed = parseMorphgntLine(line, where);
    if (parsed.book !== expectedBook) {
      throw new IngestError(`${where}: book ${parsed.book} in the file for book ${expectedBook}`);
    }
    const key = parsed.chapter * 1000 + parsed.verse;
    if (key < prevKey) throw new IngestError(`${where}: verse out of order`);
    position = key === prevKey ? position + 1 : 1;
    prevKey = key;
    tokens.push({ ...parsed, position });
  });
  return tokens;
}

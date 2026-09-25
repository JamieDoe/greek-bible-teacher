import { describe, expect, it } from "vitest";
import { createGlossLookup, parseDodson } from "./dodson";

const entry = (head: string, n: string, brief: string, full = `${brief}.`) =>
  `<entry n="${head} | ${n}">\n  <orth>${head}</orth>\n  <def role="brief">${brief}</def>\n  <def role="full">${full}</def>\n</entry>`;
const tei = (...entries: string[]) => `<?xml version="1.0"?>\n<TEI>\n${entries.join("\n")}\n</TEI>`;

describe("parseDodson", () => {
  it("maps NFC headwords to brief and full glosses, collapsing whitespace", () => {
    const lex = parseDodson(
      tei(entry("λόγος".normalize("NFD"), "3056", "a word", "a word,\n   speech.")),
    );
    expect(lex.get("λόγος")).toEqual({ brief: "a word", full: "a word, speech." });
  });

  it("merges homographs", () => {
    const lex = parseDodson(tei(entry("μήν", "3303", "indeed"), entry("μήν", "3376", "a month")));
    expect(lex.get("μήν")).toEqual({ brief: "indeed; a month", full: "indeed. / a month." });
  });

  it("fails if any entry does not match the expected shape", () => {
    const broken = `<entry n="θεός | 2316"><orth>θεός</orth><def role="brief">God</def></entry>`;
    expect(() => parseDodson(tei(entry("λόγος", "3056", "a word"), broken))).toThrow(
      /parsed 1 of 2 entries/,
    );
  });

  it("fails on XML entities rather than storing them raw", () => {
    expect(() => parseDodson(tei(entry("λόγος", "3056", "word &amp; speech")))).toThrow(/entities/);
  });
});

describe("createGlossLookup", () => {
  const lex = parseDodson(
    tei(
      entry("λόγος", "1", "a word"),
      entry("οὕτως", "2", "thus"),
      entry("μέχρι", "3", "as far as"),
      entry("Μωυσῆς", "4", "Moses"),
      entry("Ἱερουσαλήμ", "5", "Jerusalem"),
    ),
  );
  const lookup = createGlossLookup(lex);

  it("matches exactly", () => expect(lookup("λόγος")?.brief).toBe("a word"));

  it("resolves bracketed optional letters, preferring the full form", () => {
    expect(lookup("οὕτω(ς)")?.brief).toBe("thus");
    expect(lookup("μέχρι(ς)")?.brief).toBe("as far as");
  });

  it("ignores diaeresis differences", () => expect(lookup("Μωϋσῆς")?.brief).toBe("Moses"));

  it("does not guess across breathings or other spelling variants", () => {
    expect(lookup("Ἰερουσαλήμ")).toBeUndefined();
    expect(lookup("προσκαλέομαι")).toBeUndefined();
  });
});

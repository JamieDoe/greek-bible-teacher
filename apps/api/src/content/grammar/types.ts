import type { DisclosureLevel, TokenMatcher } from "@gbt/shared";

/**
 * One curated grammar concept (hand-written project content). Its position in the exported
 * list is its curriculum order.
 *
 * `body` is Markdown. Put simple explanation first, then "## Why it matters for reading";
 * terminology goes under "## Going deeper", which the app shows only in expanded views.
 */
export interface GrammarConceptContent {
  slug: string;
  title: string;
  /** One or two plain sentences, no jargon. */
  summarySimple: string;
  body: string;
  /** Lowest disclosure level that shows the "Going deeper" terminology. Default "expanded". */
  terminologyLevel?: DisclosureLevel;
  /** Real NT examples: a verse ref and a word in it (the surface word or its normalised form). */
  examples: { ref: string; word: string; occurrence?: number }[];
  /** Matchers linking tokens to this concept, each with its "Why this form?" note. */
  rules: { match: TokenMatcher; note: string }[];
}

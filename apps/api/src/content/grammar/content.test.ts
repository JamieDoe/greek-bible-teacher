import { tokenMatcherSchema } from "@gbt/shared";
import { describe, expect, it } from "vitest";
import { grammarContent } from ".";

describe("grammar curriculum content", () => {
  it("has 20–30 concepts with unique, well-formed slugs, starting from the slice concept's needs", () => {
    expect(grammarContent.length).toBeGreaterThanOrEqual(20);
    expect(grammarContent.length).toBeLessThanOrEqual(30);
    const slugs = grammarContent.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slugs.indexOf("article-and-case")).toBeLessThan(5);
  });

  it.each(grammarContent.map((c) => [c.slug, c] as const))(
    "%s: simple first, says why it matters, defers terminology, cites real examples",
    (_slug, c) => {
      expect(c.summarySimple.length).toBeLessThanOrEqual(200);
      expect(c.body).toContain("## Why it matters for reading");
      expect(c.body).toContain("## Going deeper");
      expect(c.body.indexOf("## Why it matters")).toBeLessThan(c.body.indexOf("## Going deeper"));
      expect(c.examples.length).toBeGreaterThan(0);
      for (const rule of c.rules) {
        expect(tokenMatcherSchema.safeParse(rule.match).success, JSON.stringify(rule.match)).toBe(
          true,
        );
        expect(rule.note.length).toBeLessThanOrEqual(160);
      }
    },
  );
});

// A deliberately small Markdown subset for curated grammar content: "## " / "### " headings,
// paragraphs, "- " lists, **bold** and *italic*. Greek runs are marked so they can carry
// lang="grc". Output is data (rendered by React, so text is always escaped); no raw HTML.

export type Block =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export interface Segment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  greek?: boolean;
}

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of markdown.trim().split(/\n\s*\n/)) {
    const lines = chunk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    const heading = /^(#{2,3}) (.+)$/.exec(lines[0]!);
    if (heading && lines.length === 1) {
      blocks.push({ type: "heading", level: heading[1]!.length as 2 | 3, text: heading[2]! });
    } else if (lines.every((l) => l.startsWith("- "))) {
      blocks.push({ type: "list", items: lines.map((l) => l.slice(2)) });
    } else {
      blocks.push({ type: "paragraph", text: lines.join(" ") });
    }
  }
  return blocks;
}

/** Splits a concept body into the main text and its "Going deeper" (terminology) section. */
export function splitGoingDeeper(markdown: string): { main: string; deeper: string | null } {
  const match = /^## Going deeper[ \t]*$/m.exec(markdown);
  if (!match) return { main: markdown.trim(), deeper: null };
  return {
    main: markdown.slice(0, match.index).trim(),
    deeper: markdown.slice(match.index + match[0].length).trim(),
  };
}

const GREEK_RUN =
  /[\p{Script=Greek}][\p{Script=Greek}\p{M}’]*(?:\s+[\p{Script=Greek}][\p{Script=Greek}\p{M}’]*)*/gu;

function splitGreek(seg: Segment): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of seg.text.matchAll(GREEK_RUN)) {
    if (m.index > last) out.push({ ...seg, text: seg.text.slice(last, m.index) });
    out.push({ ...seg, text: m[0], greek: true });
    last = m.index + m[0].length;
  }
  if (last < seg.text.length) out.push({ ...seg, text: seg.text.slice(last) });
  return out;
}

export function parseInline(text: string): Segment[] {
  const segments: Segment[] = [];
  const emphasis = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  for (const m of text.matchAll(emphasis)) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index) });
    segments.push(m[1] !== undefined ? { text: m[1], bold: true } : { text: m[2]!, italic: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments.flatMap(splitGreek);
}

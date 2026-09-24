import { Fragment } from "react";
import { type Block, parseBlocks, parseInline } from "@/lib/markdown";

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((seg, i) => {
        let node: React.ReactNode = seg.greek ? (
          <span lang="grc" className="font-greek text-[1.1em]">
            {seg.text}
          </span>
        ) : (
          seg.text
        );
        if (seg.italic) node = <em>{node}</em>;
        if (seg.bold) node = <strong className="font-semibold">{node}</strong>;
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return block.level === 2 ? (
        <h2 className="mt-8 font-heading text-2xl">
          <Inline text={block.text} />
        </h2>
      ) : (
        <h3 className="mt-6 font-semibold">
          <Inline text={block.text} />
        </h3>
      );
    case "list":
      return (
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
    case "paragraph":
      return (
        <p className="mt-3">
          <Inline text={block.text} />
        </p>
      );
  }
}

/** Renders curated grammar Markdown (a small, safe subset; see lib/markdown.ts). */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="leading-relaxed">
      {parseBlocks(source).map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}

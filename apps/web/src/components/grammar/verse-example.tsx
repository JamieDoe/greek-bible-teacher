import type { GrammarConceptResponse } from "@gbt/shared";

type Example = GrammarConceptResponse["concept"]["examples"][number];

export function VerseExample({ example }: { example: Example }) {
  return (
    <figure className="border-l-2 border-rule py-1 pl-4">
      <blockquote lang="grc" className="font-greek text-xl leading-[1.9]">
        {example.tokens.map((t, i) => (
          <span key={i}>
            {t.before}
            {t.isTarget ? (
              <mark className="rounded-[3px] bg-accent-soft px-0.5 text-accent">{t.word}</mark>
            ) : (
              t.word
            )}
            {t.after}{" "}
          </span>
        ))}
      </blockquote>
      <figcaption className="mt-1 text-xs text-muted">{example.displayRef}</figcaption>
    </figure>
  );
}

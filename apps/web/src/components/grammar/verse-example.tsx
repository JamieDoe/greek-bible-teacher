import type { GrammarConceptResponse } from "@gbt/shared";

type Example = GrammarConceptResponse["concept"]["examples"][number];

export function VerseExample({ example }: { example: Example }) {
  return (
    <figure className="rounded-2xl bg-muted px-5 py-4">
      <blockquote lang="grc" className="font-greek text-xl leading-[1.9]">
        {example.tokens.map((t, i) => (
          <span key={i}>
            {t.before}
            {t.isTarget ? (
              <mark className="rounded-md bg-transparent text-primary underline decoration-2 underline-offset-4">
                {t.word}
              </mark>
            ) : (
              t.word
            )}
            {t.after}{" "}
          </span>
        ))}
      </blockquote>
      <figcaption className="mt-1 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
        {example.displayRef}
      </figcaption>
    </figure>
  );
}

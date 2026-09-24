"use client";

import { addToReviewResponseSchema, type ReadingCompleteResponse } from "@gbt/shared";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SectionLabel } from "@/components/koine";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { apiPost } from "@/lib/api-client";

export interface LookedUpWord {
  lemmaId: number;
  word: string;
  lemma: string;
  gloss: string | null;
}

/**
 * The end of a read-through: what was read, what needed help, and the looked-up words, which
 * go into review unless unticked.
 */
export function PassageComplete({
  title,
  closingLine,
  result,
  lookedUp,
  lookedUpTokens,
  newWordsMet,
  inLesson,
  onReadAgain,
  onDone,
}: {
  title: string;
  closingLine: string;
  result: ReadingCompleteResponse;
  lookedUp: LookedUpWord[];
  /** Distinct words (tokens) tapped. */
  lookedUpTokens: number;
  newWordsMet: number;
  inLesson: boolean;
  onReadAgain: () => void;
  /** Called after the ticked words have been added to review. */
  onDone: (addedLemmaIds: number[]) => void;
}) {
  const [checked, setChecked] = useState(() => new Set(lookedUp.map((w) => w.lemmaId)));
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  async function done() {
    setStatus("saving");
    try {
      const ids = [...checked];
      await Promise.all(ids.map((id) => apiPost(`/review/${id}/add`, addToReviewResponseSchema)));
      onDone(ids);
    } catch (err) {
      console.error("[reader] could not add looked-up words", err);
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
      {!inLesson && (
        <Button asChild variant="ghost" size="icon" className="-ml-2" aria-label="Close">
          <Link href="/">
            <X aria-hidden="true" />
          </Link>
        </Button>
      )}
      <div className="mt-6 flex flex-col items-center text-center">
        <span className="flex size-24 items-center justify-center rounded-full ring-8 ring-accent">
          <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-8" aria-hidden="true" />
          </span>
        </span>
        <SectionLabel className="mt-6 text-primary">Passage complete</SectionLabel>
        <h1 ref={heading} tabIndex={-1} className="mt-2 font-heading text-5xl outline-none">
          {title}
        </h1>
        <p lang="grc" className="mt-3 font-greek text-xl text-muted-foreground italic">
          {closingLine}
        </p>
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-3" data-testid="passage-stats">
        <Stat value={result.wordsInPassage} label="Greek words read" />
        <Stat
          value={Math.max(0, result.wordsInPassage - lookedUpTokens)}
          label="read without help"
        />
        <Stat value={newWordsMet} label="new words met" />
      </dl>

      {lookedUp.length > 0 ? (
        <section className="mt-8" aria-labelledby="looked-up-heading">
          <div className="flex items-baseline justify-between">
            <SectionLabel>
              <span id="looked-up-heading">Words you looked up</span>
            </SectionLabel>
            <span className="text-sm text-muted-foreground">Added to review</span>
          </div>
          <ul className="mt-2 divide-y divide-border">
            {lookedUp.map((w) => (
              <li key={w.lemmaId}>
                <label className="flex cursor-pointer items-center gap-4 py-3.5">
                  <span lang="grc" className="w-28 shrink-0 font-greek text-2xl">
                    {w.word}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    <span lang="grc" className="font-greek">
                      {w.lemma}
                    </span>
                    {w.gloss ? ` · ${w.gloss}` : ""}
                  </span>
                  <Checkbox
                    checked={checked.has(w.lemmaId)}
                    aria-label={`Add ${w.lemma} to review`}
                    onCheckedChange={(on) =>
                      setChecked((s) => {
                        const next = new Set(s);
                        if (on === true) next.add(w.lemmaId);
                        else next.delete(w.lemmaId);
                        return next;
                      })
                    }
                  />
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-8 text-center text-muted-foreground">You didn’t look anything up.</p>
      )}

      <div className="mt-auto pt-8">
        <p className="text-center text-muted-foreground">
          {result.timesRead > 1 ? `Read ${result.timesRead} times. ` : "First read-through. "}
          That’s{" "}
          <strong className="text-foreground">
            {result.totalWordsRead.toLocaleString("en")}
          </strong>{" "}
          Greek words read in total.
        </p>
        {status === "error" && (
          <p role="alert" className="mt-2 text-center text-sm text-rubric">
            Couldn’t save to your review. Please try again.
          </p>
        )}
        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={status === "saving"}
          onClick={() => void done()}
        >
          {inLesson ? "Continue" : "Done for today"} <Check aria-hidden="true" />
        </Button>
        {!inLesson && (
          <Button variant="ghost" className="mt-2 w-full" onClick={onReadAgain}>
            Read again
          </Button>
        )}
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Card size="sm" className="gap-1 px-4 text-left">
      <dt className="text-sm leading-snug text-muted-foreground">{label}</dt>
      <dd className="order-first font-heading text-4xl">{value.toLocaleString("en")}</dd>
    </Card>
  );
}

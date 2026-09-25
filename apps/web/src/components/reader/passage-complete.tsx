"use client";

import { addToReviewResponseSchema, type ReadingCompleteResponse } from "@gbt/shared";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SectionLabel, StageLabel } from "@/components/koine";
import { IconArrowRight, IconCheck, IconClose } from "@/components/icons";
import { CountUp } from "@/components/count-up";
import { SuccessMark } from "@/components/success-mark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/states";
import { apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

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
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-[max(34px,env(safe-area-inset-bottom))]">
      <div className="-ml-2 h-11">
        {!inLesson && (
          <Button asChild variant="ghost" size="icon" aria-label="Close">
            <Link href="/">
              <IconClose size={22} />
            </Link>
          </Button>
        )}
      </div>
      <div className="mt-2 flex flex-col items-center text-center">
        <SuccessMark />
        <StageLabel
          label="δ′ · Passage complete"
          className="mt-[18px] animate-[rise-in_320ms_var(--ease-sheet)_160ms_both]"
        />
        <h1
          ref={heading}
          tabIndex={-1}
          className="mt-2 animate-[rise-in_320ms_var(--ease-sheet)_200ms_both] font-heading text-4xl outline-none"
        >
          {title}
        </h1>
        <p
          lang="grc"
          className="mt-2 animate-[rise-in_320ms_var(--ease-sheet)_240ms_both] font-greek text-lg text-ink-2 italic"
        >
          {closingLine}
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-2" data-testid="passage-stats">
        <Stat value={result.wordsInPassage} label="Greek words read" />
        <Stat
          value={Math.max(0, result.wordsInPassage - lookedUpTokens)}
          label="read without help"
        />
        <Stat value={newWordsMet} label="new words met" />
      </dl>

      {lookedUp.length > 0 ? (
        <section className="mt-5" aria-labelledby="looked-up-heading">
          <div className="flex items-baseline justify-between">
            <SectionLabel>
              <span id="looked-up-heading">Words you looked up</span>
            </SectionLabel>
            <span className="text-[13px] text-muted-foreground">Added to review</span>
          </div>
          <ul className="mt-1.5">
            {lookedUp.map((w, i) => (
              <li key={w.lemmaId} className={cn(i > 0 && "border-t border-border")}>
                <label className="flex h-[54px] cursor-pointer items-center gap-3">
                  <span lang="grc" className="w-[108px] shrink-0 truncate font-greek text-[19px]">
                    {w.word}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    <span lang="grc" className="font-greek text-ink-2">
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
        <div className="mt-8 flex justify-center">
          <EmptyState variant="inline" icon={IconCheck}>
            You didn’t look anything up: every word read without help.
          </EmptyState>
        </div>
      )}

      <div className="mt-auto pt-8">
        <p className="mb-3.5 text-center text-sm text-muted-foreground">
          {result.timesRead > 1 ? `Read ${result.timesRead} times. ` : "First read-through. "}
          That’s{" "}
          <span className="font-semibold text-foreground">
            <CountUp
              value={result.totalWordsRead}
              from={Math.max(0, result.totalWordsRead - result.wordsInPassage)}
            />
          </span>{" "}
          Greek words read in total.
        </p>
        {status === "error" && (
          <p role="alert" className="mb-2 text-center text-sm text-rubric">
            Couldn’t save to your review. Please try again.
          </p>
        )}
        <Button
          size="lg"
          className="w-full"
          disabled={status === "saving"}
          onClick={() => void done()}
        >
          {inLesson ? "Continue" : "Done for today"} <IconArrowRight size={20} />
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
    <div className="flex flex-col rounded-xl bg-card px-3 py-3.5 shadow-card">
      <dt className="mt-1.5 text-xs leading-[1.3] text-muted-foreground">{label}</dt>
      <dd className="order-first font-greek text-[30px] leading-none">
        <CountUp value={value} />
      </dd>
    </div>
  );
}

"use client";

import {
  grammarConceptResponseSchema,
  type GrammarConceptResponse,
  type GrammarQuickCheck,
  type LessonStep,
  passageResponseSchema,
  type PassageResponse,
} from "@gbt/shared";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Markdown } from "@/components/grammar/markdown";
import { ParadigmTable } from "@/components/grammar/paradigm-table";
import { VerseExample } from "@/components/grammar/verse-example";
import { Reader } from "@/components/reader/reader";
import { SectionLabel } from "@/components/koine";
import { IconArrowRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { apiGet, apiPost } from "@/lib/api-client";
import { splitGoingDeeper } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

/** Fetches once per key, with a retry, keeping each step's loading/error states explicit. */
function useLoad<T>(key: string, load: () => Promise<T>): [Load<T>, () => void] {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; value: Load<T> } | null>(null);
  const requestKey = `${key}#${attempt}`;
  useEffect(() => {
    let cancelled = false;
    load()
      .then(
        (data) => !cancelled && setResult({ key: requestKey, value: { status: "ready", data } }),
      )
      .catch((err: unknown) => {
        console.error(`[lesson] could not load ${key}`, err);
        if (!cancelled) setResult({ key: requestKey, value: { status: "error" } });
      });
    return () => {
      cancelled = true;
    };
    // `load` is recreated each render; the key identifies the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);
  const value = result?.key === requestKey ? result.value : { status: "loading" as const };
  return [value, () => setAttempt((a) => a + 1)];
}

export function ReadingStep({
  passageId,
  onFinished,
}: {
  passageId: number;
  onFinished: (lookedUp: number[]) => void;
}) {
  const [load, retry] = useLoad<PassageResponse["passage"]>(
    `passage-${passageId}`,
    async () => (await apiGet(`/passages/${passageId}`, passageResponseSchema)).passage,
  );
  if (load.status === "loading") return <StepSkeleton label="Loading the passage" />;
  if (load.status === "error") {
    return <ErrorState message="We couldn’t load the passage." onRetry={retry} />;
  }
  return <Reader passage={load.data} embedded onFinished={onFinished} />;
}

const progressSchema = z.object({ status: z.string() });

export function GrammarStep({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [load, retry] = useLoad<GrammarConceptResponse["concept"]>(
    `grammar-${slug}`,
    async () => (await apiGet(`/grammar/${slug}`, grammarConceptResponseSchema)).concept,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  if (load.status === "loading") return <StepSkeleton label="Loading the lesson" />;
  if (load.status === "error") {
    return <ErrorState message="We couldn’t load this grammar lesson." onRetry={retry} />;
  }
  const concept = load.data;
  const { main } = splitGoingDeeper(concept.body);

  async function studied() {
    setSaving(true);
    setError(false);
    try {
      await apiPost(`/grammar/${slug}/progress`, progressSchema, { status: "studied" });
      onDone();
    } catch (err) {
      console.error("[lesson] could not mark studied", err);
      setError(true);
      setSaving(false);
    }
  }

  const [example] = concept.examples;
  const body = (
    <div className="rounded-2xl bg-card p-[18px] shadow-card">
      <Markdown source={main} />
    </div>
  );
  return (
    <section
      aria-labelledby="grammar-heading"
      className="flex flex-1 animate-[fade-in_150ms_ease-out] flex-col"
    >
      <h2
        id="grammar-heading"
        className="mt-2 font-heading text-[34px] leading-[1.15] tracking-[-0.01em]"
      >
        {concept.title}
      </h2>
      <p className="mt-2.5 text-base leading-normal text-ink-2">{concept.summarySimple}</p>

      {concept.paradigm ? (
        <ParadigmTable paradigm={concept.paradigm} />
      ) : (
        <div className="mt-5">{body}</div>
      )}

      {example && (
        <div className="mt-4 rounded-lg bg-accent px-4 py-3.5">
          <div className="flex justify-between">
            <SectionLabel className="text-primary">In the wild</SectionLabel>
            <span className="font-mono text-[11px] text-primary uppercase">
              {example.displayRef}
            </span>
          </div>
          <p lang="grc" className="mt-1.5 font-greek text-[22px] leading-snug">
            {example.tokens.map((t, i) => (
              <span key={i}>
                {t.before}
                {t.isTarget ? (
                  <span className="text-primary underline decoration-[1.5px] underline-offset-[5px]">
                    {t.word}
                  </span>
                ) : (
                  t.word
                )}
                {t.after}{" "}
              </span>
            ))}
          </p>
        </div>
      )}

      {concept.paradigm && (
        <details className="group mt-4">
          <summary className="cursor-pointer text-[15px] font-medium text-primary">
            Read the full lesson
          </summary>
          <div className="mt-3">{body}</div>
        </details>
      )}

      <div className="min-h-6 flex-1" />
      {concept.quickCheck ? (
        <QuickCheck check={concept.quickCheck} saving={saving} onContinue={() => void studied()} />
      ) : (
        <Button size="lg" className="w-full" onClick={() => void studied()} disabled={saving}>
          {saving ? "Saving…" : "Got it, continue"} <IconArrowRight size={20} />
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-rubric">
          Couldn’t save. Please try again.
        </p>
      )}
    </section>
  );
}

const hasGreek = (s: string) => /\p{Script=Greek}/u.test(s);

/** The design's "Quick check": pick one, Check, see why, then continue. */
function QuickCheck({
  check,
  saving,
  onContinue,
}: {
  check: GrammarQuickCheck;
  saving: boolean;
  onContinue: () => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const right = checked && chosen === check.answer;
  return (
    <div>
      <p id="quick-check" className="mb-2.5 text-[15px] font-semibold">
        Quick check: {check.question.charAt(0).toLowerCase() + check.question.slice(1)}
      </p>
      <div role="radiogroup" aria-labelledby="quick-check" className="mb-3.5 flex gap-2">
        {check.options.map((option, i) => {
          const state = !checked
            ? chosen === i
              ? "chosen"
              : "idle"
            : i === check.answer
              ? "answer"
              : i === chosen
                ? "wrong"
                : "idle";
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={chosen === i}
              disabled={checked}
              lang={hasGreek(option) ? "grc" : undefined}
              onClick={() => setChosen(i)}
              className={cn(
                "pressable h-14 min-w-0 flex-1 basis-0 rounded-md border px-2 text-foreground",
                hasGreek(option) ? "font-greek text-xl" : "text-[15px] font-medium",
                state === "idle" && "border-border bg-card",
                state === "chosen" && "border-2 border-primary bg-accent",
                state === "answer" && "border-2 border-correct bg-correct-soft",
                state === "wrong" && "border-2 border-rubric bg-rubric-soft",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {checked && (
        <p role="status" className="mb-3.5 text-[15px] leading-[1.45] text-ink-2">
          <span className={cn("font-bold", right ? "text-correct" : "text-rubric")}>
            {right ? "Correct." : "Not quite."}
          </span>{" "}
          {check.explanation}
        </p>
      )}
      {checked ? (
        <Button size="lg" className="w-full" onClick={onContinue} disabled={saving}>
          {saving ? "Saving…" : "Got it, continue"} <IconArrowRight size={20} />
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full"
          disabled={chosen === null}
          onClick={() => setChecked(true)}
        >
          Check
        </Button>
      )}
    </div>
  );
}

/** A step's shape while its content loads. */
function StepSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="mt-2 space-y-4">
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

export function InvestigateStep({
  step,
  onDone,
}: {
  step: Extract<LessonStep, { kind: "investigate" }>;
  onDone: () => void;
}) {
  return (
    <section aria-labelledby="investigate-heading">
      <h2
        id="investigate-heading"
        className="mt-2 font-heading text-[34px] leading-[1.15] tracking-[-0.01em]"
      >
        Spot the forms
      </h2>
      <p className="mt-2.5 text-base text-ink-2">
        These words in the passage show today’s grammar: {step.conceptTitle.toLowerCase()}.
      </p>
      <div className="mt-6 space-y-8">
        {step.verses.map((v) => (
          <div key={v.displayRef}>
            <VerseExample example={{ ...v, tokenId: 0 }} />
            <ul className="mt-3 space-y-1 text-sm">
              {v.notes.map((n, i) => (
                <li key={i}>
                  <span lang="grc" className="font-greek text-base">
                    {n.word}
                  </span>
                  <span className="text-muted-foreground">: </span>
                  {n.note}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Button size="lg" className="mt-8 w-full" onClick={onDone}>
        Continue <IconArrowRight size={20} />
      </Button>
    </section>
  );
}

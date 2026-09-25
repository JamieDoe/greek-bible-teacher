"use client";

import {
  partOfSpeechLabel,
  type ReviewGrade,
  type ReviewItem,
  sm2Scheduler,
  type SrsState,
} from "@gbt/shared";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SectionLabel } from "@/components/koine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { SpeakButton } from "../speech";

type Phase = "intro" | "question" | "answered";
type Ease = Exclude<ReviewGrade, "again">;

/** When the word comes back after `grade`, previewed with the same scheduler the API uses. */
function nextReviewLabel(srs: ReviewItem["srs"], grade: ReviewGrade): string {
  const previous: SrsState | null = srs && {
    ...srs,
    nextReviewAt: new Date(srs.nextReviewAt),
    lastReviewedAt: new Date(srs.lastReviewedAt),
  };
  const next = sm2Scheduler.review(previous, grade, new Date());
  if (grade === "again") return "Back later in this session";
  const days = Math.round(next.intervalDays);
  return days <= 1 ? "Next review tomorrow" : `Next review in ${days} days`;
}

/**
 * One review card, recognition-first. New words are introduced (word, gloss, an NT example),
 * then asked; every question is multiple choice, the word alone or in its verse.
 */
export function ExerciseCard({
  item,
  retry,
  introduce = false,
  saving,
  onGrade,
  onShowAgain,
}: {
  item: ReviewItem;
  retry: boolean;
  /** Show the introduction card first even for words that aren't new. */
  introduce?: boolean;
  saving: boolean;
  onGrade: (grade: ReviewGrade, correct: boolean) => void;
  /** "Show me again": bring this introduction back later without grading. */
  onShowAgain?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(
    (item.kind === "new" || introduce) && !retry ? "intro" : "question",
  );
  const [chosen, setChosen] = useState<number | null>(null);
  const [ease, setEase] = useState<Ease>("good");
  const heading = useRef<HTMLHeadingElement>(null);
  const { exercise, lemma } = item;
  const correct = chosen === exercise.answerIndex;

  useEffect(() => heading.current?.focus(), [phase]);

  if (phase === "intro") {
    return (
      <section aria-labelledby="card-heading" data-lemma-id={item.lemmaId}>
        <SectionLabel className="mb-3 text-primary">New word</SectionLabel>
        <Card className="items-center gap-4 px-6 text-center">
          <div className="flex w-full justify-end">
            <SpeakButton text={lemma.lemma} label={`Hear ${lemma.lemma}`} />
          </div>
          <h2
            id="card-heading"
            ref={heading}
            tabIndex={-1}
            lang="grc"
            className="font-greek text-7xl leading-none outline-none"
          >
            {lemma.lemma}
          </h2>
          <p className="text-2xl font-semibold" data-testid="intro-gloss">
            {lemma.gloss}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {lemma.partOfSpeech && (
              <Badge variant="parsing">{partOfSpeechLabel(lemma.partOfSpeech)}</Badge>
            )}
            <Badge variant="parsing">{lemma.ntFrequency.toLocaleString("en")}× in the NT</Badge>
          </div>
          {item.example && (
            <div className="mt-2 w-full rounded-2xl bg-muted px-5 py-4 text-left">
              <p lang="grc" className="font-greek text-xl leading-relaxed">
                {item.example.tokens.map((t, i) => (
                  <span key={i}>
                    {t.before}
                    {t.isTarget ? (
                      <span className="text-primary underline decoration-2 underline-offset-4">
                        {t.word}
                      </span>
                    ) : (
                      t.word
                    )}
                    {t.after}{" "}
                  </span>
                ))}
              </p>
              <SectionLabel className="mt-1">{item.example.displayRef}</SectionLabel>
            </div>
          )}
        </Card>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={onShowAgain} disabled={!onShowAgain}>
            Show me again
          </Button>
          <Button size="lg" onClick={() => setPhase("question")}>
            Got it <Check aria-hidden="true" />
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="card-heading" data-lemma-id={item.lemmaId} className="pb-72">
      <SectionLabel className="text-primary">What does this mean?</SectionLabel>
      {exercise.type === "context" && exercise.context ? (
        <div className="mt-6">
          <p lang="grc" className="font-greek text-3xl leading-relaxed">
            {exercise.context.tokens.map((t, i) => (
              <span key={i}>
                {t.before}
                {t.isTarget ? (
                  <mark className="rounded-md bg-accent px-1 text-primary underline decoration-2 underline-offset-4">
                    {t.word}
                  </mark>
                ) : (
                  t.word
                )}
                {t.after}{" "}
              </span>
            ))}
          </p>
          <SectionLabel className="mt-2">{exercise.context.displayRef}</SectionLabel>
          <h2 id="card-heading" ref={heading} tabIndex={-1} className="sr-only">
            What does the highlighted word mean?
          </h2>
        </div>
      ) : (
        <div className="mt-8 text-center">
          <h2
            id="card-heading"
            ref={heading}
            tabIndex={-1}
            lang="grc"
            className="font-greek text-7xl leading-none outline-none"
          >
            {lemma.lemma}
          </h2>
          {lemma.partOfSpeech && (
            <SectionLabel className="mt-3">{partOfSpeechLabel(lemma.partOfSpeech)}</SectionLabel>
          )}
        </div>
      )}
      {retry && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          You missed this earlier. Try again.
        </p>
      )}

      <ul className="mt-8 grid gap-3">
        {exercise.options.map((option, i) => {
          const isAnswer = i === exercise.answerIndex;
          const state =
            phase !== "answered" ? "idle" : isAnswer ? "answer" : i === chosen ? "wrong" : "dim";
          return (
            <li key={i}>
              <button
                type="button"
                disabled={phase === "answered"}
                onClick={() => {
                  setChosen(i);
                  setPhase("answered");
                }}
                className={cn(
                  "flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border bg-card px-5 py-4 text-left text-lg transition-colors",
                  state === "idle" && "border-border hover:border-primary",
                  state === "answer" && "border-2 border-correct bg-correct-soft px-[19px]",
                  state === "wrong" && "border-2 border-rubric bg-rubric-soft px-[19px]",
                  state === "dim" && "border-border text-muted-foreground",
                )}
              >
                <span>{option}</span>
                {state === "answer" && (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-correct text-card">
                    <Check className="size-4" aria-label="Correct answer" />
                  </span>
                )}
                {state === "wrong" && (
                  <span className="shrink-0 font-mono text-xs tracking-[0.08em] text-rubric">
                    NOT QUITE
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {phase === "answered" && (
        <div
          id="feedback"
          className="fixed inset-x-0 bottom-0 z-20 rounded-t-[1.75rem] bg-card px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_-12px_rgb(0_0_0/0.18)]"
        >
          <div className="mx-auto max-w-xl">
            <p role="status" className="flex flex-wrap items-baseline gap-x-3">
              <span
                className={cn("text-xl font-semibold", correct ? "text-correct" : "text-rubric")}
              >
                {correct ? "Correct" : "Not quite"}
              </span>
              <span className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
                {nextReviewLabel(item.srs, correct ? ease : "again")}
              </span>
            </p>
            <p className="mt-2">
              <span lang="grc" className="font-greek text-lg">
                {lemma.lemma}
              </span>{" "}
              {correct ? (
                <>appears {lemma.ntFrequency.toLocaleString("en")}× in the NT.</>
              ) : (
                <>means “{lemma.gloss}”. It will come back shortly.</>
              )}
            </p>
            {correct && (
              <ToggleGroup
                type="single"
                variant="segmented"
                aria-label="How easy was it?"
                className="mt-4"
                value={ease}
                onValueChange={(v) => v && setEase(v as Ease)}
              >
                <ToggleGroupItem value="hard">Hard</ToggleGroupItem>
                <ToggleGroupItem value="good">Good</ToggleGroupItem>
                <ToggleGroupItem value="easy">Easy</ToggleGroupItem>
              </ToggleGroup>
            )}
            <Button
              size="lg"
              className="mt-4 w-full"
              disabled={saving}
              onClick={() => onGrade(correct ? ease : "again", correct)}
            >
              Continue <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

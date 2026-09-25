"use client";

import {
  DECLENSION_LABELS,
  partOfSpeechLabel,
  type ReviewGrade,
  type ReviewItem,
  sm2Scheduler,
  type SrsState,
  transliterate,
} from "@gbt/shared";
import { useEffect, useRef, useState } from "react";
import { SectionLabel, StageLabel } from "@/components/koine";
import { IconArrowRight, IconCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
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

const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Noun", "Masculine", "2nd declension": the chips under a word. */
function wordChips(lemma: ReviewItem["lemma"]): string[] {
  return [
    lemma.partOfSpeech ? partOfSpeechLabel(lemma.partOfSpeech) : null,
    lemma.gender ? capitalise(lemma.gender) : null,
    lemma.declension ? DECLENSION_LABELS[lemma.declension] : null,
  ].filter((c): c is string => c !== null);
}

function GreekVerse({
  tokens,
  className,
}: {
  tokens: { before: string; word: string; after: string; isTarget: boolean }[];
  className: string;
}) {
  return (
    <p lang="grc" className={className}>
      {tokens.map((t, i) => (
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
  );
}

/**
 * One review card, recognition-first. New words are introduced on a card that flips to reveal
 * the meaning (design "03 · Vocabulary lesson"), then asked; every question is multiple choice,
 * the word alone or in its verse (design "05 · Review"). The answer panel sits at the foot of the
 * screen in the layout, so nothing scrolls behind it.
 */
export function ExerciseCard({
  item,
  retry,
  introduce = false,
  label,
  first = false,
  saving,
  onGrade,
  onShowAgain,
}: {
  item: ReviewItem;
  retry: boolean;
  /** Show the introduction card first even for words that aren't new. */
  introduce?: boolean;
  /** The stage prefix for the label row, e.g. "α′ · Review" or "β′". */
  label: string;
  /** The first card after the skeleton: it fades in where the skeleton was, not from the side. */
  first?: boolean;
  saving: boolean;
  onGrade: (grade: ReviewGrade, correct: boolean) => void;
  /** "Show me again": bring this introduction back later without grading. */
  onShowAgain?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(
    (item.kind === "new" || introduce) && !retry ? "intro" : "question",
  );
  const [initialPhase] = useState(phase);
  const [flipped, setFlipped] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const [ease, setEase] = useState<Ease>("good");
  const heading = useRef<HTMLHeadingElement>(null);
  const { exercise, lemma } = item;
  const correct = chosen === exercise.answerIndex;
  const chips = wordChips(lemma);

  useEffect(() => heading.current?.focus({ preventScroll: true }), [phase]);

  // Each card, and the question after an introduction, arrives from the right like a lesson step.
  const enter =
    first && phase === initialPhase
      ? "animate-[fade-in_150ms_ease-out]"
      : "animate-[step-in_240ms_var(--ease-sheet)]";

  if (phase === "intro") {
    return (
      <section
        key="intro"
        aria-labelledby="card-heading"
        data-lemma-id={item.lemmaId}
        className={cn("flex flex-1 flex-col", enter)}
      >
        <div className="mb-3 flex items-center justify-between">
          <StageLabel label={`${label} · New word`} />
          <span className="text-[13px] text-muted-foreground">
            {flipped ? "Tap card to flip back" : "Tap card to flip"}
          </span>
        </div>
        <div className="relative flex flex-1 flex-col rounded-3xl bg-card p-6 shadow-card">
          <div className="absolute top-4 right-4 z-10">
            <SpeakButton text={lemma.lemma} label={`Hear ${lemma.lemma}`} />
          </div>
          {/* Tapping the card reveals the meaning; only the meaning animates. */}
          <button
            type="button"
            aria-pressed={flipped}
            aria-label={flipped ? "Hide the meaning" : "Show the meaning"}
            onClick={() => setFlipped((f) => !f)}
            className="absolute inset-0 z-0 rounded-3xl"
          />
          <div className="pointer-events-none relative flex flex-1 flex-col">
            <div className="mt-9 text-center">
              <h2
                id="card-heading"
                ref={heading}
                tabIndex={-1}
                lang="grc"
                className="font-greek text-[76px] leading-[1.05] tracking-[-0.02em] outline-none"
              >
                {lemma.lemma}
              </h2>
              <p className="mt-1.5 font-greek text-[17px] text-muted-foreground italic">
                {transliterate(lemma.lemma)}
              </p>
              {flipped ? (
                <p
                  className="mt-[18px] flex h-8 items-center justify-center text-2xl font-medium tracking-[-0.01em] animate-[meaning-in_240ms_var(--ease-sheet)]"
                  data-testid="intro-gloss"
                >
                  {lemma.gloss}
                </p>
              ) : (
                <p className="mt-[18px] flex h-8 items-center justify-center text-[15px] text-muted-foreground animate-[fade-in_160ms_ease-out]">
                  Tap to see the meaning
                </p>
              )}
            </div>
            {chips.length > 0 && (
              <ul
                className="mt-[18px] flex flex-wrap justify-center gap-1.5"
                aria-label="Word type"
              >
                {chips.map((c) => (
                  <li
                    key={c}
                    className="inline-flex h-[30px] items-center rounded-sm bg-muted px-[11px] font-mono text-xs font-medium text-ink-2"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-[22px] mb-4 h-px bg-border" />
            <div className="flex items-baseline justify-between">
              <SectionLabel>Forms you’ll meet</SectionLabel>
              <span className="font-mono text-[11px] text-ink-2">
                {lemma.ntFrequency.toLocaleString("en")}× IN THE NT
              </span>
            </div>
            <ul lang="grc" className="mt-2.5 flex flex-wrap gap-1.5">
              {lemma.forms.map((f) => (
                <li
                  key={f.form}
                  className="inline-flex h-[30px] items-center rounded-sm bg-background px-[11px] font-greek text-[17px]"
                >
                  {f.form}
                </li>
              ))}
            </ul>
            <div className="min-h-4 flex-1" />
            {item.example && (
              <div className="rounded-lg bg-muted px-4 py-3.5">
                <GreekVerse
                  tokens={item.example.tokens}
                  className="font-greek text-[19px] leading-[1.4]"
                />
                <p className="mt-1 font-mono text-[11px] text-muted-foreground uppercase">
                  {item.example.displayRef}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Button variant="outline" size="lg" onClick={onShowAgain} disabled={!onShowAgain}>
            Show me again
          </Button>
          <Button size="lg" onClick={() => setPhase("question")}>
            Got it <IconCheck size={20} strokeWidth={2} />
          </Button>
        </div>
      </section>
    );
  }

  const posLine = [lemma.partOfSpeech ? partOfSpeechLabel(lemma.partOfSpeech) : null, lemma.gender]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      key="question"
      aria-labelledby="card-heading"
      data-lemma-id={item.lemmaId}
      className={cn("flex flex-1 flex-col", enter)}
    >
      <StageLabel label={`${label} · What does this mean?`} />
      {exercise.type === "context" && exercise.context ? (
        <div className="mt-8 mb-10">
          <p lang="grc" className="font-greek text-[28px] leading-relaxed">
            {exercise.context.tokens.map((t, i) => (
              <span key={i}>
                {t.before}
                {t.isTarget ? (
                  <mark className="rounded-[5px] bg-accent px-1 text-primary">{t.word}</mark>
                ) : (
                  t.word
                )}
                {t.after}{" "}
              </span>
            ))}
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground uppercase">
            {exercise.context.displayRef}
          </p>
          <h2 id="card-heading" ref={heading} tabIndex={-1} className="sr-only">
            What does the highlighted word mean?
          </h2>
        </div>
      ) : (
        <div className="mt-14 mb-12 text-center [@media(max-height:700px)]:mt-6 [@media(max-height:700px)]:mb-6">
          <h2
            id="card-heading"
            ref={heading}
            tabIndex={-1}
            lang="grc"
            className="font-greek text-[84px] leading-none tracking-[-0.02em] outline-none [@media(max-height:700px)]:text-[64px]"
          >
            {lemma.lemma}
          </h2>
          {posLine && (
            <p className="mt-3 font-mono text-xs text-muted-foreground uppercase">{posLine}</p>
          )}
        </div>
      )}
      {retry && (
        <p className="-mt-6 mb-4 text-center text-sm text-muted-foreground">
          You missed this earlier. Try again.
        </p>
      )}

      <ul className="grid gap-2.5 [@media(max-height:700px)]:gap-2">
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
                  "pressable flex h-[60px] w-full items-center [@media(max-height:700px)]:h-[52px] justify-between gap-3 rounded-lg border px-[18px] text-left text-lg font-medium transition-colors duration-[160ms]",
                  state === "idle" && "border-border bg-card text-foreground hover:border-primary",
                  state === "answer" &&
                    "border-2 border-correct bg-correct-soft px-[17px] text-foreground",
                  state === "wrong" &&
                    "animate-[nudge_280ms_ease-out] border-2 border-rubric bg-rubric-soft px-[17px] text-foreground",
                  state === "dim" && "border-border bg-card text-muted-foreground",
                )}
              >
                <span className="truncate">{option}</span>
                {state === "answer" && (
                  <span className="flex size-[26px] shrink-0 animate-[pop-in_160ms_var(--ease-sheet)] items-center justify-center rounded-full bg-correct text-correct-soft">
                    <IconCheck
                      size={16}
                      strokeWidth={2.6}
                      className="draw-in [--draw-delay:100ms]"
                      role="img"
                      aria-label="Correct answer"
                      aria-hidden={false}
                    />
                  </span>
                )}
                {state === "wrong" && (
                  <span className="shrink-0 animate-[fade-in_160ms_ease-out] font-mono text-xs tracking-[0.08em] text-rubric">
                    NOT QUITE
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="min-h-6 flex-1" />
      {phase === "answered" && (
        <section
          id="feedback"
          aria-live="polite"
          className="sticky bottom-0 -mx-5 mt-2 -mb-[max(34px,env(safe-area-inset-bottom))] rounded-t-3xl bg-card px-5 pt-5 pb-[max(34px,env(safe-area-inset-bottom))] shadow-sheet animate-[rise-in_260ms_var(--ease-sheet)] sm:-mx-6 sm:px-6"
        >
          <p role="status" className="flex flex-wrap items-baseline gap-x-2.5">
            <span className={cn("text-[17px] font-bold", correct ? "text-correct" : "text-rubric")}>
              {correct ? "Correct" : "Not quite"}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground uppercase">
              {nextReviewLabel(item.srs, correct ? ease : "again")}
            </span>
          </p>
          <p className="mt-1.5 text-[15px] leading-[1.45] text-ink-2">
            <span lang="grc" className="font-greek text-foreground">
              {lemma.lemma}
            </span>{" "}
            {correct ? (
              <>
                appears {lemma.ntFrequency.toLocaleString("en")}× in the NT.
                {item.inPassage && (
                  <>
                    {" "}
                    You’ll read it {times(item.inPassage.count)} in{" "}
                    {item.inPassage.count === 1 ? item.inPassage.displayRef : item.inPassage.title}.
                  </>
                )}
              </>
            ) : (
              <>means “{lemma.gloss}”. It will come back shortly.</>
            )}
          </p>
          {correct && (
            <ToggleGroup
              type="single"
              variant="segmented"
              size="sm"
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
            Continue <IconArrowRight size={20} />
          </Button>
        </section>
      )}
    </section>
  );
}

"use client";

import {
  type LessonResponse,
  lessonProgressSchema,
  lessonResponseSchema,
  type LessonStep,
} from "@gbt/shared";
import Link from "next/link";
import { SectionLabel, STAGE_MARKS } from "@/components/koine";
import { IconClose } from "@/components/icons";
import { SuccessMark } from "@/components/success-mark";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { stageOf, stageStatuses } from "@/lib/stages";
import { useEffect, useRef, useState } from "react";
import { ReviewSession } from "@/components/review/review-session";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, PageShell } from "@/components/ui/states";
import { apiGet, apiPost } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { GrammarStep, InvestigateStep, ReadingStep } from "./steps";

type Lesson = LessonResponse["lesson"];

const STEP_LABELS: Record<LessonStep["kind"], string> = {
  review_due: "Review",
  vocab: "New words",
  grammar: "Grammar",
  reading: "Read",
  investigate: "Look closer",
  review_recall: "Recall",
  reread: "Read again",
};

/**
 * The daily session: review due → new words → grammar → guided reading → look closer →
 * recall → re-read. The step is saved as the learner advances, so a reload resumes it.
 */
export function LessonRunner({ lessonId }: { lessonId: number }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState(0);
  // The step the lesson opened on fades in where its skeleton was; later steps slide in.
  const [openingStep, setOpeningStep] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Words looked up during the guided reading, reviewed in the recall step.
  const [lookedUp, setLookedUp] = useState<number[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    ensureSession()
      .then(() => apiGet(`/lessons/${lessonId}`, lessonResponseSchema))
      .then(({ lesson: l }) => {
        if (cancelled) return;
        setLesson(l);
        const resumeAt = l.progress && !l.progress.completedAt ? l.progress.currentStep : 0;
        setStep(Math.min(resumeAt, l.steps.length - 1));
        setOpeningStep(Math.min(resumeAt, l.steps.length - 1));
      })
      .catch((err: unknown) => {
        console.error("[lesson] could not load lesson", err);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId, attempt]);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    scroller.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [step, done]);

  if (error) {
    return (
      <PageShell>
        <ErrorState
          message="We couldn’t load this lesson. Check your connection and try again."
          onRetry={() => {
            setError(false);
            setAttempt((a) => a + 1);
          }}
        />
      </PageShell>
    );
  }
  if (!lesson) {
    return (
      <PageShell>
        <div role="status" aria-label="Preparing today’s lesson" className="space-y-4">
          <Skeleton className="h-1 w-full" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-[420px] w-full rounded-3xl bg-card" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </PageShell>
    );
  }

  async function advance() {
    if (!lesson) return;
    const last = step >= lesson.steps.length - 1;
    const next = last ? step : step + 1;
    setSaveError(false);
    try {
      await apiPost(`/lessons/${lesson.id}/progress`, lessonProgressSchema, {
        step: next,
        completed: last,
      });
    } catch (err) {
      console.error("[lesson] could not save progress", err);
      setSaveError(true);
      return;
    }
    if (last) setDone(true);
    else setStep(next);
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center px-5 pt-[calc(env(safe-area-inset-top)+64px)] pb-[max(34px,env(safe-area-inset-bottom))] text-center">
        <SuccessMark />
        <SectionLabel className="mt-[18px] animate-[rise-in_320ms_var(--ease-sheet)_160ms_both] text-primary">
          Lesson {lesson.number} complete
        </SectionLabel>
        <h1
          ref={heading}
          tabIndex={-1}
          className="mt-2 animate-[rise-in_320ms_var(--ease-sheet)_200ms_both] font-heading text-4xl outline-none"
        >
          Lesson complete
        </h1>
        <p className="mt-2 animate-[rise-in_320ms_var(--ease-sheet)_240ms_both] text-[17px] text-ink-2">
          You read {lesson.passage.title} twice and learned new words and grammar along the way.
        </p>
        <Button asChild size="lg" className="mt-auto w-full">
          <Link href="/">Back to Today</Link>
        </Button>
      </main>
    );
  }

  const current = lesson.steps[step]!;
  const onDone = () => void advance();
  const stages = stageStatuses(
    lesson.steps.map((s) => s.kind),
    step,
  );
  const stageIndex = stages.findIndex((s) => s.key === stageOf(current.kind));

  // Review-type steps draw their own label row (design: "β′ · New word"); others get it here.
  const ownLabel = ["review_due", "vocab", "review_recall"].includes(current.kind);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 pr-5 pl-3 sm:pr-6">
          <Button asChild variant="ghost" size="icon" aria-label="Leave lesson">
            <Link href="/">
              <IconClose size={22} />
            </Link>
          </Button>
          <ol className="flex flex-1 gap-1" aria-label="Lesson stages">
            {stages.map((s) => (
              <li key={s.key} className="flex-1">
                <Progress value={s.progress * 100} aria-label={`${s.label}: ${s.state}`} />
              </li>
            ))}
          </ol>
          <span className="w-8 text-right font-mono text-xs text-muted-foreground">
            {step + 1}/{lesson.steps.length}
          </span>
        </div>
        <h1 ref={heading} tabIndex={-1} className="sr-only">
          {lesson.title}: step {step + 1} of {lesson.steps.length}, {STEP_LABELS[current.kind]}
        </h1>
        <p className="sr-only" aria-live="polite">
          Step {step + 1} of {lesson.steps.length}: {STEP_LABELS[current.kind]}
        </p>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-5 pt-5 sm:px-6">
          {/* Each step arrives from the right: the lesson only moves forward. */}
          <div
            key={step}
            className={cn(
              "flex flex-1 flex-col",
              step === openingStep
                ? "animate-[fade-in_150ms_ease-out]"
                : "animate-[step-in_260ms_var(--ease-sheet)]",
            )}
          >
            {!ownLabel && (
              <SectionLabel className="text-primary">
                <span lang="grc" className="font-greek text-[13px] normal-case">
                  {STAGE_MARKS[stageIndex]}
                </span>{" "}
                · {STEP_LABELS[current.kind]}
                {current.kind === "grammar" && " · one idea"}
              </SectionLabel>
            )}
            <StepView
              step={current}
              stageMark={STAGE_MARKS[stageIndex] ?? ""}
              lookedUp={lookedUp}
              onLookedUp={setLookedUp}
              onDone={onDone}
            />
          </div>
          {saveError && (
            <p role="alert" className="mt-4 text-sm text-rubric">
              Couldn’t save your progress. Check your connection and press Continue again.
            </p>
          )}
          <div className="h-[max(34px,env(safe-area-inset-bottom))] shrink-0" />
        </div>
      </div>
    </div>
  );
}

function StepView({
  step,
  stageMark,
  lookedUp,
  onLookedUp,
  onDone,
}: {
  step: LessonStep;
  stageMark: string;
  lookedUp: number[];
  onLookedUp: (ids: number[]) => void;
  onDone: () => void;
}) {
  switch (step.kind) {
    case "review_due":
      return (
        <ReviewSession
          mode="due"
          context="lesson"
          label={`${stageMark} · Review`}
          onDone={onDone}
        />
      );
    case "vocab":
      return (
        <ReviewSession
          lemmaIds={step.lemmaIds.join(",")}
          introduceAll
          context="lesson"
          label={stageMark}
          onDone={onDone}
        />
      );
    case "grammar":
      return <GrammarStep slug={step.slug} onDone={onDone} />;
    case "reading":
      return (
        <ReadingStep
          passageId={step.passageId}
          onFinished={(ids) => {
            onLookedUp(ids);
            onDone();
          }}
        />
      );
    case "investigate":
      return <InvestigateStep step={step} onDone={onDone} />;
    case "review_recall": {
      const ids = [...new Set([...step.lemmaIds, ...lookedUp])];
      return (
        <ReviewSession
          lemmaIds={ids.join(",")}
          context="lesson"
          label={`${stageMark} · Recall`}
          onDone={onDone}
        />
      );
    }
    case "reread":
      return <ReadingStep passageId={step.passageId} onFinished={() => onDone()} />;
  }
}

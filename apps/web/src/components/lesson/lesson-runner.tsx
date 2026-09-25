"use client";

import {
  type LessonResponse,
  lessonProgressSchema,
  lessonResponseSchema,
  type LessonStep,
} from "@gbt/shared";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { SectionLabel, STAGE_MARKS } from "@/components/koine";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { stageOf, stageStatuses } from "@/lib/stages";
import { useEffect, useRef, useState } from "react";
import { ReviewSession } from "@/components/review/review-session";
import { ErrorState, LoadingState, PageShell } from "@/components/ui/states";
import { apiGet, apiPost } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";
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
  const [done, setDone] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Words looked up during the guided reading, reviewed in the recall step.
  const [lookedUp, setLookedUp] = useState<number[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    ensureSession()
      .then(() => apiGet(`/lessons/${lessonId}`, lessonResponseSchema))
      .then(({ lesson: l }) => {
        if (cancelled) return;
        setLesson(l);
        const resumeAt = l.progress && !l.progress.completedAt ? l.progress.currentStep : 0;
        setStep(Math.min(resumeAt, l.steps.length - 1));
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
    heading.current?.focus();
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
        <LoadingState label="Preparing today’s lesson…" />
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
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center px-4 pt-16 pb-10 text-center sm:px-6">
        <span className="flex size-24 items-center justify-center rounded-full ring-8 ring-accent">
          <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-8" aria-hidden="true" />
          </span>
        </span>
        <SectionLabel className="mt-6 text-primary">Lesson {lesson.number} complete</SectionLabel>
        <h1 ref={heading} tabIndex={-1} className="mt-2 font-heading text-4xl outline-none">
          Lesson complete
        </h1>
        <p className="mt-3 text-muted-foreground">
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

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-3 pt-3 sm:px-6">
          <Button asChild variant="ghost" size="icon" aria-label="Leave lesson">
            <Link href="/">
              <X aria-hidden="true" />
            </Link>
          </Button>
          <ol className="flex flex-1 gap-1.5" aria-label="Lesson stages">
            {stages.map((s) => (
              <li key={s.key} className="flex-1">
                <Progress
                  value={s.progress * 100}
                  aria-label={`${s.label}: ${s.state}`}
                  className="h-1"
                />
              </li>
            ))}
          </ol>
          <span className="w-10 text-right font-mono text-xs text-muted-foreground">
            {step + 1}/{lesson.steps.length}
          </span>
        </div>
        <div className="mx-auto max-w-2xl px-4 pt-4 pb-2 sm:px-6">
          <p className="font-mono text-xs tracking-[0.08em] text-primary uppercase">
            <span lang="grc" className="font-greek text-sm normal-case">
              {STAGE_MARKS[stageIndex]}
            </span>{" "}
            · {STEP_LABELS[current.kind]}
          </p>
          <h1 ref={heading} tabIndex={-1} className="sr-only">
            {lesson.title}: step {step + 1} of {lesson.steps.length}, {STEP_LABELS[current.kind]}
          </h1>
          <p className="sr-only" aria-live="polite">
            Step {step + 1} of {lesson.steps.length}: {STEP_LABELS[current.kind]}
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-16 sm:px-6">
        <StepView
          key={step}
          step={current}
          lookedUp={lookedUp}
          onLookedUp={setLookedUp}
          onDone={onDone}
        />
        {saveError && (
          <p role="alert" className="mt-4 text-sm text-rubric">
            Couldn’t save your progress. Check your connection and press Continue again.
          </p>
        )}
      </div>
    </div>
  );
}

function StepView({
  step,
  lookedUp,
  onLookedUp,
  onDone,
}: {
  step: LessonStep;
  lookedUp: number[];
  onLookedUp: (ids: number[]) => void;
  onDone: () => void;
}) {
  switch (step.kind) {
    case "review_due":
      return <ReviewSession mode="due" context="lesson" onDone={onDone} />;
    case "vocab":
      return (
        <ReviewSession
          lemmaIds={step.lemmaIds.join(",")}
          introduceAll
          context="lesson"
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
      return <ReviewSession lemmaIds={ids.join(",")} context="lesson" onDone={onDone} />;
    }
    case "reread":
      return <ReadingStep passageId={step.passageId} onFinished={() => onDone()} />;
  }
}

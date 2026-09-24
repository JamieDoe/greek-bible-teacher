"use client";

import {
  type LessonResponse,
  lessonProgressSchema,
  lessonResponseSchema,
  type LessonStep,
} from "@gbt/shared";
import Link from "next/link";
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
      <PageShell>
        <h1 ref={heading} tabIndex={-1} className="font-serif text-3xl outline-none">
          Lesson complete
        </h1>
        <p className="mt-2 text-muted">
          You read {lesson.passage.title} twice and learned new words and grammar along the way.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-ink px-6 py-2.5 text-sm text-paper hover:opacity-90"
        >
          Back to Today
        </Link>
      </PageShell>
    );
  }

  const current = lesson.steps[step]!;
  const onDone = () => void advance();

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 sm:px-8">
      <header className="mb-6">
        <p className="text-sm text-muted">
          <Link href="/" className="hover:text-ink">
            Today
          </Link>{" "}
          · Lesson {lesson.number}
        </p>
        <h1 ref={heading} tabIndex={-1} className="mt-1 font-serif text-2xl outline-none">
          {lesson.title}
        </h1>
        <ol className="mt-4 flex gap-1" aria-label="Lesson steps">
          {lesson.steps.map((s, i) => (
            <li
              key={i}
              aria-current={i === step ? "step" : undefined}
              title={STEP_LABELS[s.kind]}
              className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-accent" : i === step ? "bg-ink" : "bg-rule"}`}
            >
              <span className="sr-only">
                {STEP_LABELS[s.kind]}
                {i < step ? " (done)" : ""}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-muted" aria-live="polite">
          Step {step + 1} of {lesson.steps.length}: {STEP_LABELS[current.kind]}
        </p>
      </header>

      <div className="pb-16">
        <StepView
          key={step}
          step={current}
          lookedUp={lookedUp}
          onLookedUp={setLookedUp}
          onDone={onDone}
        />
        {saveError && (
          <p role="alert" className="mt-4 text-sm text-muted">
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
          heading="Read slowly; tap any word"
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
      return (
        <ReadingStep
          passageId={step.passageId}
          heading="Read it again"
          onFinished={() => onDone()}
        />
      );
  }
}

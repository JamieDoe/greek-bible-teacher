"use client";

import {
  gradeResponseSchema,
  type ReviewGrade,
  type ReviewItem,
  reviewQueueResponseSchema,
} from "@gbt/shared";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconArrowRight, IconCheck, IconClose, IconLearn } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, PageShell } from "@/components/ui/states";
import { apiGet, apiPost } from "@/lib/api-client";
import { nextReviewIn } from "@/lib/next-review";
import { ensureSession } from "@/lib/session";
import { ExerciseCard } from "./exercise-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/** A missed word comes back this many cards later in the same session. */
const RESURFACE_AFTER = 3;

interface SessionCard {
  item: ReviewItem;
  /** Seen earlier in this session and missed. */
  retry: boolean;
  /** "Show me again" on an introduction: introduce it once more. */
  reintroduce?: boolean;
}

type Load =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; cards: SessionCard[]; dueCount: number; nextReviewAt: string | null };

interface Props {
  /** Review exactly these words (comma-separated ids): a lesson's new or looked-up words. */
  lemmaIds?: string;
  /** "due": only words due now (the lesson's first step). */
  mode?: "mixed" | "due";
  /** Introduce every word before asking it (the lesson's vocabulary step). */
  introduceAll?: boolean;
  /** Recorded with each grade. */
  context?: "review" | "lesson";
  /** Inside a lesson: called instead of showing the stand-alone summary links. */
  onDone?: () => void;
  /** The stage prefix for each card's label row (default "α′ · Review"). */
  label?: string;
}

export function ReviewSession({
  lemmaIds,
  mode = "mixed",
  introduceAll = false,
  context = "review",
  onDone,
  label = "α′ · Review",
}: Props) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState({ answered: 0, firstTry: 0 });
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (lemmaIds) params.set("lemmaIds", lemmaIds);
    if (mode === "due") params.set("mode", "due");
    const query = params.size > 0 ? `?${params}` : "";
    ensureSession()
      .then(() => apiGet(`/review/queue${query}`, reviewQueueResponseSchema))
      .then((q) => {
        if (cancelled) return;
        setLoad({
          status: "ready",
          cards: q.items.map((item) => ({ item, retry: false })),
          dueCount: q.dueCount,
          nextReviewAt: q.nextReviewAt,
        });
      })
      .catch((err: unknown) => {
        console.error("[review] could not load queue", err);
        if (!cancelled) setLoad({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [lemmaIds, mode, attempt]);

  const showAgain = useCallback(
    (card: SessionCard) => {
      setLoad((l) => {
        if (l.status !== "ready") return l;
        const cards = [...l.cards];
        cards.splice(Math.min(index + 1 + RESURFACE_AFTER, cards.length), 0, {
          item: card.item,
          retry: false,
          reintroduce: true,
        });
        return { ...l, cards };
      });
      setIndex((i) => i + 1);
    },
    [index],
  );

  const grade = useCallback(
    async (card: SessionCard, g: ReviewGrade, correct: boolean) => {
      setSaving(true);
      setSaveError(false);
      try {
        await apiPost(`/review/${card.item.lemmaId}`, gradeResponseSchema, { grade: g, context });
      } catch (err) {
        console.error("[review] could not save grade", err);
        setSaveError(true);
        setSaving(false);
        return;
      }
      setSaving(false);
      setStats((s) => ({
        answered: s.answered + (card.retry ? 0 : 1),
        firstTry: s.firstTry + (!card.retry && correct ? 1 : 0),
      }));
      setLoad((l) => {
        if (l.status !== "ready" || correct) return l;
        const cards = [...l.cards];
        cards.splice(Math.min(index + 1 + RESURFACE_AFTER, cards.length), 0, {
          item: card.item,
          retry: true,
        });
        return { ...l, cards };
      });
      setIndex((i) => i + 1);
    },
    [index, context],
  );

  const Shell = onDone ? EmbeddedShell : PageShell;

  if (load.status === "loading") {
    return onDone ? (
      <CardSkeleton />
    ) : (
      <StandaloneFrame progress={null}>
        <CardSkeleton />
      </StandaloneFrame>
    );
  }
  if (load.status === "error") {
    return (
      <Shell title="Review">
        <ErrorState
          message="We couldn’t load your review. Check your connection and try again."
          onRetry={() => {
            setLoad({ status: "loading" });
            setAttempt((a) => a + 1);
          }}
        />
      </Shell>
    );
  }
  if (load.cards.length === 0) {
    const next = load.nextReviewAt && nextReviewIn(new Date(load.nextReviewAt), new Date());
    if (onDone) {
      // A lesson's first step, when nothing is due: say so, then move on.
      return (
        <div className="flex flex-1 flex-col">
          <div className="my-auto py-10">
            <EmptyState variant="plain" icon={IconCheck} title="Nothing due yet">
              {next
                ? `Your words are up to date. The next ones come back ${next}.`
                : "Words you learn come back here when it’s time to review them."}
            </EmptyState>
          </div>
          <ContinueButton onClick={onDone} />
        </div>
      );
    }
    return (
      <StandaloneFrame progress={null} showProgress={false}>
        <div className="my-auto py-10">
          {next ? (
            <EmptyState
              variant="plain"
              icon={IconCheck}
              title="All caught up"
              actions={
                <>
                  <Button asChild size="lg">
                    <Link href="/read">Read a passage</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/">Back to Today</Link>
                  </Button>
                </>
              }
            >
              No words are due right now. The next ones come back {next}.
            </EmptyState>
          ) : (
            <EmptyState
              variant="plain"
              icon={IconLearn}
              title="No words to review yet"
              actions={
                <>
                  <Button asChild size="lg">
                    <Link href="/">Start today’s lesson</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/read">Read a passage</Link>
                  </Button>
                </>
              }
            >
              Words join your review as you learn them in lessons or look them up while reading.
            </EmptyState>
          )}
        </div>
      </StandaloneFrame>
    );
  }

  const card = load.cards[index];
  if (!card) {
    return <Summary answered={stats.answered} firstTry={stats.firstTry} onDone={onDone} />;
  }

  const done = index;
  const total = load.cards.length;
  const exercise = (
    <>
      <ExerciseCard
        key={`${index}-${card.item.lemmaId}`}
        item={card.item}
        retry={card.retry}
        introduce={(introduceAll || card.reintroduce === true) && !card.retry}
        label={label}
        first={index === 0}
        saving={saving}
        onGrade={(g, correct) => void grade(card, g, correct)}
        onShowAgain={() => showAgain(card)}
      />
      {saveError && (
        <p role="alert" className="mt-4 text-sm text-rubric">
          Couldn’t save that answer. Check your connection and choose again.
        </p>
      )}
    </>
  );

  if (onDone) {
    return (
      <div className="flex flex-1 flex-col">
        <p className="sr-only" aria-live="polite">
          {total - done} to go
        </p>
        {exercise}
      </div>
    );
  }

  return <StandaloneFrame progress={{ done, total }}>{exercise}</StandaloneFrame>;
}

/** The stand-alone review screen (design "05 · Review"): ✕, one progress bar, and the count. */
function StandaloneFrame({
  progress,
  showProgress = true,
  children,
}: {
  progress: { done: number; total: number } | null;
  /** Hidden when there is nothing to review. */
  showProgress?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-3 pr-5 pl-3">
          <Button asChild variant="ghost" size="icon" aria-label="Leave review">
            <Link href="/">
              <IconClose size={22} />
            </Link>
          </Button>
          {showProgress ? (
            <Progress
              value={progress ? (100 * progress.done) / progress.total : 0}
              aria-label="Review progress"
              className="flex-1"
            />
          ) : (
            <span className="flex-1" />
          )}
          <span
            className="w-11 text-right font-mono text-xs text-muted-foreground"
            aria-live="polite"
          >
            {progress && `${progress.done}/${progress.total}`}
            {progress && <span className="sr-only">: {progress.total - progress.done} to go</span>}
          </span>
        </div>
        <h1 className="sr-only">Review</h1>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-5 pt-5">
          {children}
          <div className="h-[max(34px,env(safe-area-inset-bottom))] shrink-0" />
        </div>
      </main>
    </div>
  );
}

/** A review card's shape while the queue loads. */
function CardSkeleton() {
  return (
    <div role="status" aria-label="Preparing your review" className="flex flex-1 flex-col">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mx-auto mt-14 h-20 w-40" />
      <Skeleton className="mx-auto mt-3 h-3 w-24" />
      <div className="mt-12 grid gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[60px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Inside a lesson the stepper supplies the page chrome. */
function EmbeddedShell({ children }: { title?: string; children: React.ReactNode }) {
  return <div>{children}</div>;
}

function ContinueButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="lg" className="mt-6 w-full" onClick={onClick}>
      Continue <IconArrowRight size={20} />
    </Button>
  );
}

function Summary({
  answered,
  firstTry,
  onDone,
}: {
  answered: number;
  firstTry: number;
  onDone?: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const Shell = onDone ? EmbeddedShell : PageShell;
  return (
    <Shell>
      <h1
        ref={heading}
        tabIndex={-1}
        className="animate-[rise-in_320ms_var(--ease-sheet)_both] font-heading text-4xl outline-none"
      >
        Review done
      </h1>
      <p className="mt-2 animate-[rise-in_320ms_var(--ease-sheet)_60ms_both] text-muted-foreground">
        {answered} {answered === 1 ? "word" : "words"}, {firstTry} right first time.
      </p>
      {onDone ? (
        <ContinueButton onClick={onDone} />
      ) : (
        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/read">Keep reading</Link>
        </Button>
      )}
    </Shell>
  );
}

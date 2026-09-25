"use client";

import {
  gradeResponseSchema,
  type ReviewGrade,
  type ReviewItem,
  reviewQueueResponseSchema,
} from "@gbt/shared";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState, ErrorState, LoadingState, PageShell } from "@/components/ui/states";
import { apiGet, apiPost } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";
import { ExerciseCard } from "./exercise-card";
import { ArrowRight, X } from "lucide-react";
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
  | { status: "ready"; cards: SessionCard[]; dueCount: number };

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
}

export function ReviewSession({
  lemmaIds,
  mode = "mixed",
  introduceAll = false,
  context = "review",
  onDone,
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
    return (
      <Shell title="Review">
        <LoadingState label="Preparing your review…" />
      </Shell>
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
    return onDone ? (
      <Shell>
        <EmptyState>Nothing is due for review yet.</EmptyState>
        <ContinueButton onClick={onDone} />
      </Shell>
    ) : (
      <PageShell title="Review">
        <EmptyState>
          Nothing to review right now.{" "}
          <Link href="/read" className="underline underline-offset-2">
            Read a passage
          </Link>{" "}
          and come back later.
        </EmptyState>
      </PageShell>
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
      <div>
        <p className="mb-4 text-right font-mono text-xs text-muted-foreground" aria-live="polite">
          {total - done} to go
        </p>
        {exercise}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-4 px-3 pt-3 sm:px-6">
          <Button asChild variant="ghost" size="icon" aria-label="Leave review">
            <Link href="/">
              <X aria-hidden="true" />
            </Link>
          </Button>
          <Progress
            value={(100 * done) / total}
            aria-label="Review progress"
            className="h-1 flex-1"
          />
          <span
            className="w-12 text-right font-mono text-xs text-muted-foreground"
            aria-live="polite"
          >
            {done}/{total}
          </span>
        </div>
        <p className="mx-auto max-w-xl px-4 pt-4 font-mono text-xs tracking-[0.08em] text-primary uppercase sm:px-6">
          <span lang="grc" className="font-greek text-sm normal-case">
            α′
          </span>{" "}
          · Review
          <span className="sr-only">: {total - done} to go</span>
        </p>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 sm:px-6">{exercise}</main>
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
      Continue <ArrowRight aria-hidden="true" />
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
      <h1 ref={heading} tabIndex={-1} className="font-heading text-4xl outline-none">
        Review done
      </h1>
      <p className="mt-2 text-muted-foreground">
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

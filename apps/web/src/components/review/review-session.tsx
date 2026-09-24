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

/** A missed word comes back this many cards later in the same session. */
const RESURFACE_AFTER = 3;

interface Card {
  item: ReviewItem;
  /** Seen earlier in this session and missed. */
  retry: boolean;
}

type Load =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; cards: Card[]; dueCount: number };

export function ReviewSession({ lemmaIds }: { lemmaIds?: string }) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState({ answered: 0, firstTry: 0 });
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const query = lemmaIds ? `?lemmaIds=${lemmaIds}` : "";
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
  }, [lemmaIds, attempt]);

  const grade = useCallback(
    async (card: Card, g: ReviewGrade, correct: boolean) => {
      setSaving(true);
      setSaveError(false);
      try {
        await apiPost(`/review/${card.item.lemmaId}`, gradeResponseSchema, { grade: g });
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
    [index],
  );

  if (load.status === "loading") {
    return (
      <PageShell title="Review">
        <LoadingState label="Preparing your review…" />
      </PageShell>
    );
  }
  if (load.status === "error") {
    return (
      <PageShell title="Review">
        <ErrorState
          message="We couldn’t load your review. Check your connection and try again."
          onRetry={() => {
            setLoad({ status: "loading" });
            setAttempt((a) => a + 1);
          }}
        />
      </PageShell>
    );
  }
  if (load.cards.length === 0) {
    return (
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
    return <Summary answered={stats.answered} firstTry={stats.firstTry} />;
  }

  const remaining = load.cards.length - index;
  return (
    <PageShell>
      <div className="mb-6 flex items-baseline justify-between text-sm text-muted">
        <span>{lemmaIds ? "Words you looked up" : "Review"}</span>
        <span aria-live="polite">{remaining} to go</span>
      </div>
      <ExerciseCard
        key={`${index}-${card.item.lemmaId}`}
        item={card.item}
        retry={card.retry}
        saving={saving}
        onGrade={(g, correct) => void grade(card, g, correct)}
      />
      {saveError && (
        <p role="alert" className="mt-4 text-sm text-muted">
          Couldn’t save that answer. Check your connection and choose again.
        </p>
      )}
    </PageShell>
  );
}

function Summary({ answered, firstTry }: { answered: number; firstTry: number }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <PageShell>
      <h1 ref={heading} tabIndex={-1} className="font-serif text-3xl outline-none">
        Review done
      </h1>
      <p className="mt-2 text-muted">
        {answered} {answered === 1 ? "word" : "words"}, {firstTry} right first time.
      </p>
      <div className="mt-6 flex gap-2 text-sm">
        <Link href="/read" className="rounded-full bg-ink px-5 py-2 text-paper hover:opacity-90">
          Keep reading
        </Link>
      </div>
    </PageShell>
  );
}

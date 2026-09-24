"use client";

import { progressResponseSchema, type ProgressResponse } from "@gbt/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState, PageShell } from "@/components/ui/states";
import { apiGet } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";
import { BarChart } from "./bar-chart";

const DAYS = 28;

export function ProgressView() {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | { status: "ready"; p: ProgressResponse }
  >({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    ensureSession()
      .then(() =>
        apiGet(`/progress?tz=${encodeURIComponent(tz)}&days=${DAYS}`, progressResponseSchema),
      )
      .then((p) => !cancelled && setState({ status: "ready", p }))
      .catch((err: unknown) => {
        console.error("[progress] could not load", err);
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (state.status === "loading") {
    return (
      <PageShell title="Progress">
        <LoadingState label="Counting…" />
      </PageShell>
    );
  }
  if (state.status === "error") {
    return (
      <PageShell title="Progress">
        <ErrorState
          message="We couldn’t load your progress. Please try again."
          onRetry={() => {
            setState({ status: "loading" });
            setAttempt((a) => a + 1);
          }}
        />
      </PageShell>
    );
  }

  const p = state.p;
  const nothingYet = p.greekWordsRead === 0 && p.reviews.total === 0 && p.conceptsStudied === 0;

  return (
    <PageShell title="Progress">
      {nothingYet ? (
        <EmptyState>
          Nothing to show yet.{" "}
          <Link href="/" className="underline underline-offset-2">
            Start today’s lesson
          </Link>{" "}
          and your reading and reviews will appear here.
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-muted">Words learned</p>
          <p className="font-sans text-5xl font-semibold" data-testid="words-learned">
            {p.words.learned.toLocaleString("en")}
          </p>
          <p className="mt-1 text-sm text-muted">
            Reviewed until they last {p.words.learnedThresholdDays}+ days between reviews.{" "}
            {p.words.learning.toLocaleString("en")} more in progress.
          </p>

          <dl
            className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4"
            data-testid="progress-stats"
          >
            <Stat label="Greek words read" value={p.greekWordsRead} />
            <Stat label="Passages completed" value={p.passagesCompleted} />
            <Stat label="Grammar studied" value={p.conceptsStudied} />
            <div>
              <dt className="text-sm text-muted">Review accuracy</dt>
              <dd className="mt-1 text-2xl font-semibold">
                {p.reviews.total === 0
                  ? "–"
                  : `${Math.round((100 * p.reviews.correct) / p.reviews.total)}%`}
              </dd>
              <dd className="text-xs text-muted">
                {p.reviews.correct} of {p.reviews.total} right
                {p.reviews.last7Days.total > 0 &&
                  ` · last 7 days ${p.reviews.last7Days.correct}/${p.reviews.last7Days.total}`}
              </dd>
            </div>
          </dl>

          <section aria-labelledby="activity-heading" className="mt-10 space-y-8">
            <h2 id="activity-heading" className="font-serif text-xl">
              Activity, last {DAYS} days
            </h2>
            <BarChart
              title="Greek words read"
              unit="words"
              data={p.activity.map((a) => ({ date: a.date, value: a.wordsRead }))}
            />
            <BarChart
              title="Reviews"
              unit="reviews"
              data={p.activity.map((a) => ({ date: a.date, value: a.reviews }))}
            />
          </section>
        </>
      )}
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value.toLocaleString("en")}</dd>
    </div>
  );
}

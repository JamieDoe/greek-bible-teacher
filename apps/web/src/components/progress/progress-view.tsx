"use client";

import { progressResponseSchema, type ProgressResponse } from "@gbt/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/koine";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState, ErrorState, LoadingState, PageShell } from "@/components/ui/states";
import { apiGet } from "@/lib/api-client";
import { heatmapWeeks } from "@/lib/heatmap";
import { ensureSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/** 14 weeks of activity, as in the design. */
const DAYS = 98;

// Sequential lapis ramp for the heatmap (one hue, light → dark; level 0 = no activity).
const LEVELS = ["bg-border", "bg-primary/20", "bg-primary/45", "bg-primary/70", "bg-primary"];

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
  const activeDays = p.activity.filter((a) => a.wordsRead + a.reviews > 0).length;
  const weeks = heatmapWeeks(
    p.activity.map((a) => ({ date: a.date, count: a.wordsRead + a.reviews })),
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-12 sm:px-6 lg:pt-12">
      <h1 className="font-heading text-5xl">Progress</h1>

      {nothingYet ? (
        <EmptyState>
          <span className="mt-6 block">
            Nothing to show yet.{" "}
            <Link href="/" className="underline underline-offset-2">
              Start today’s lesson
            </Link>{" "}
            and your reading and reviews will appear here.
          </span>
        </EmptyState>
      ) : (
        <>
          <Card className="mt-6 gap-4 px-6">
            <p className="flex items-baseline gap-3">
              <span
                className="font-heading text-7xl leading-none text-primary"
                data-testid="words-learned"
              >
                {p.words.learned.toLocaleString("en")}
              </span>
              <span className="text-xl font-semibold">words learned</span>
            </p>
            <Progress
              value={(100 * p.milestone.learned) / Math.max(1, p.milestone.total)}
              aria-label="Progress towards the next milestone"
              className="h-1.5"
            />
            <p className="flex justify-between gap-4 text-muted-foreground">
              <span>
                Next milestone: every word used {p.milestone.minFrequency}+ times in the NT
              </span>
              <span className="shrink-0 text-foreground tabular-nums">
                {p.milestone.learned} / {p.milestone.total}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              A word counts as learned once it lasts {p.words.learnedThresholdDays}+ days between
              reviews. {p.words.learning.toLocaleString("en")} more in progress.
            </p>
          </Card>

          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3" data-testid="progress-stats">
            <Stat label="Greek words read" value={p.greekWordsRead} />
            <Stat label="passages completed" value={p.passagesCompleted} />
            <Stat label="grammar concepts" value={p.conceptsStudied} />
            <Stat label="days practised" value={p.daysPractised} />
            <Card size="sm" className="gap-1 px-5">
              <dt className="text-muted-foreground">review accuracy</dt>
              <dd className="order-first font-heading text-4xl">
                {p.reviews.total === 0
                  ? "–"
                  : `${Math.round((100 * p.reviews.correct) / p.reviews.total)}%`}
              </dd>
              <dd className="text-xs text-muted-foreground">
                {p.reviews.total === 0
                  ? "No reviews yet"
                  : `${p.reviews.correct} of ${p.reviews.total} right`}
                {p.reviews.last7Days.total > 0 &&
                  ` · last 7 days ${p.reviews.last7Days.correct}/${p.reviews.last7Days.total}`}
              </dd>
            </Card>
          </dl>

          <section aria-labelledby="activity-heading" className="mt-10">
            <div className="flex items-baseline justify-between">
              <SectionLabel>
                <span id="activity-heading">Last 14 weeks</span>
              </SectionLabel>
              <span
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
                aria-hidden="true"
              >
                less
                {LEVELS.map((c) => (
                  <span key={c} className={cn("size-3 rounded-[3px]", c)} />
                ))}
                more
              </span>
            </div>
            <div
              role="img"
              aria-label={`Activity over the last 14 weeks: ${activeDays} active ${activeDays === 1 ? "day" : "days"}. Table below.`}
              className="mt-3 flex gap-1.5"
            >
              {weeks.map((week) => (
                <div key={week[0]!.date} className="flex flex-1 flex-col gap-1.5">
                  {week.map((d) => (
                    <span
                      key={d.date}
                      title={`${d.date}: ${d.count}`}
                      className={cn("aspect-square w-full rounded-[4px]", LEVELS[d.level])}
                    />
                  ))}
                </div>
              ))}
            </div>
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Show as table</summary>
              <table className="mt-2 w-full text-left">
                <thead>
                  <tr>
                    <th className="py-1 font-normal">Day</th>
                    <th className="py-1 text-right font-normal">Greek words read</th>
                    <th className="py-1 text-right font-normal">Reviews</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {p.activity
                    .filter((a) => a.wordsRead + a.reviews > 0)
                    .map((a) => (
                      <tr key={a.date} className="border-t border-border">
                        <td className="py-1">{a.date}</td>
                        <td className="py-1 text-right tabular-nums">{a.wordsRead}</td>
                        <td className="py-1 text-right tabular-nums">{a.reviews}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </details>
          </section>

          {p.recentlyLearned.length > 0 && (
            <section aria-labelledby="recent-heading" className="mt-10">
              <SectionLabel>
                <span id="recent-heading">Recently learned</span>
              </SectionLabel>
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.recentlyLearned.map((w) => (
                  <li key={w.lemma}>
                    <Badge
                      variant="greek"
                      lang="grc"
                      title={w.gloss ?? undefined}
                      className="bg-card"
                    >
                      {w.lemma}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm" className="gap-1 px-5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="order-first font-heading text-4xl">{value.toLocaleString("en")}</dd>
    </Card>
  );
}

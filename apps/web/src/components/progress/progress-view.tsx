"use client";

import { progressResponseSchema, type ProgressResponse } from "@gbt/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/koine";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { apiGet } from "@/lib/api-client";
import { heatmapWeeks } from "@/lib/heatmap";
import { ensureSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/** 14 weeks of activity, as in the design. */
const DAYS = 98;

// The design's four lapis steps (level 0 = no activity); solid colours, lightness carries meaning.
const LEVELS = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3"];

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

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-8 lg:px-14 lg:pt-12">
      <h1 className="font-heading text-[34px] lg:text-[40px]">Progress</h1>
      {state.status === "loading" ? (
        <ProgressSkeleton />
      ) : state.status === "error" ? (
        <div className="mt-6">
          <ErrorState
            message="We couldn’t load your progress. Please try again."
            onRetry={() => {
              setState({ status: "loading" });
              setAttempt((a) => a + 1);
            }}
          />
        </div>
      ) : (
        <ProgressBody p={state.p} />
      )}
    </main>
  );
}

function ProgressBody({ p }: { p: ProgressResponse }) {
  const nothingYet = p.greekWordsRead === 0 && p.reviews.total === 0 && p.conceptsStudied === 0;
  const activeDays = p.activity.filter((a) => a.wordsRead + a.reviews > 0).length;
  const weeks = heatmapWeeks(
    p.activity.map((a) => ({ date: a.date, count: a.wordsRead + a.reviews })),
  );

  if (nothingYet) {
    return (
      <EmptyState>
        <span className="mt-6 block">
          Nothing to show yet.{" "}
          <Link href="/" className="underline underline-offset-2">
            Start today’s lesson
          </Link>{" "}
          and your reading and reviews will appear here.
        </span>
      </EmptyState>
    );
  }

  return (
    <div className="animate-[fade-in_150ms_ease-out]">
      <Card className="mt-[18px] gap-0 px-5">
        <p className="flex items-baseline gap-3">
          <span
            className="font-greek text-[64px] leading-none tracking-[-0.02em] text-primary"
            data-testid="words-learned"
          >
            {p.words.learned.toLocaleString("en")}
          </span>
          <span className="text-[17px] font-medium">words learned</span>
        </p>
        <Progress
          value={(100 * p.milestone.learned) / Math.max(1, p.milestone.total)}
          aria-label="Progress towards the next milestone"
          className="mt-[18px] h-1.5"
        />
        <p className="mt-2.5 flex justify-between gap-4 text-[13px] text-muted-foreground">
          <span>Next milestone: every word used {p.milestone.minFrequency}+ times in the NT</span>
          <span className="shrink-0 font-mono text-ink-2">
            {p.milestone.learned}/{p.milestone.total}
          </span>
        </p>
      </Card>

      <dl className="mt-2.5 grid grid-cols-2 gap-2.5 lg:grid-cols-3" data-testid="progress-stats">
        <Stat label="Greek words read" value={p.greekWordsRead} />
        <Stat label="passages completed" value={p.passagesCompleted} />
        <Stat label="grammar concepts" value={p.conceptsStudied} />
        <Stat label="days practised" value={p.daysPractised} />
        <div className="col-span-2 flex flex-col rounded-[18px] bg-card p-4 shadow-card lg:col-span-2">
          <dt className="mt-2 text-[13px] text-muted-foreground">review accuracy</dt>
          <dd className="order-first font-greek text-[32px] leading-none">
            {p.reviews.total === 0
              ? "–"
              : `${Math.round((100 * p.reviews.correct) / p.reviews.total)}%`}
          </dd>
          <dd className="mt-1 text-xs text-muted-foreground">
            {p.reviews.total === 0
              ? "No reviews yet"
              : `${p.reviews.correct} of ${p.reviews.total} right`}
            {p.reviews.last7Days.total > 0 &&
              ` · last 7 days ${p.reviews.last7Days.correct}/${p.reviews.last7Days.total}`}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="activity-heading" className="mt-[22px]">
        <div className="flex items-baseline justify-between">
          <SectionLabel>
            <span id="activity-heading">Last 14 weeks</span>
          </SectionLabel>
          <span className="text-xs text-muted-foreground" aria-hidden="true">
            less → more
          </span>
        </div>
        <div
          role="img"
          aria-label={`Activity over the last 14 weeks: ${activeDays} active ${activeDays === 1 ? "day" : "days"}. Table below.`}
          className="mt-2.5 flex gap-1"
        >
          {weeks.map((week) => (
            <div key={week[0]!.date} className="flex flex-col gap-1">
              {week.map((d) => (
                <span
                  key={d.date}
                  title={`${d.date}: ${d.count}`}
                  className={cn("size-[17px] rounded-[4px]", LEVELS[d.level])}
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
        <section aria-labelledby="recent-heading" className="mt-5">
          <SectionLabel>
            <span id="recent-heading">Recently learned</span>
          </SectionLabel>
          <ul lang="grc" className="mt-2.5 flex flex-wrap gap-1.5">
            {p.recentlyLearned.map((w) => (
              <li
                key={w.lemma}
                title={w.gloss ?? undefined}
                className="inline-flex h-[30px] items-center rounded-sm bg-card px-[11px] font-greek text-[17px]"
              >
                {w.lemma}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col rounded-[18px] bg-card p-4 shadow-card">
      <dt className="mt-2 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="order-first font-greek text-[32px] leading-none">
        {value.toLocaleString("en")}
      </dd>
    </div>
  );
}

/** Progress while it loads: the hero, stat tiles and heatmap in outline. */
function ProgressSkeleton() {
  return (
    <div role="status" aria-label="Counting your progress">
      <div className="mt-[18px] rounded-2xl bg-card p-5 shadow-card">
        <div className="flex items-end gap-3">
          <Skeleton className="h-16 w-20" />
          <Skeleton className="mb-1 h-5 w-32" />
        </div>
        <Skeleton className="mt-[18px] h-1.5 w-full rounded-full" />
        <div className="mt-2.5 flex justify-between gap-4">
          <Skeleton className="h-3.5 w-3/5" />
          <Skeleton className="h-3.5 w-10" />
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn("rounded-[18px] bg-card p-4 shadow-card", i === 4 && "col-span-2")}
          >
            <Skeleton className="h-8 w-14" />
            <Skeleton className="mt-2 h-3.5 w-28" />
            {i === 4 && <Skeleton className="mt-1.5 h-3 w-36" />}
          </div>
        ))}
      </div>
      <div className="mt-[22px] flex justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="mt-2.5 flex gap-1">
        {Array.from({ length: 14 }, (_, w) => (
          <div key={w} className="flex flex-col gap-1">
            {Array.from({ length: 7 }, (_, d) => (
              <Skeleton key={d} className="size-[17px] rounded-[4px]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

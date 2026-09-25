"use client";

import {
  lessonsListResponseSchema,
  type LessonsListResponse,
  todayResponseSchema,
} from "@gbt/shared";
import { IconArrowRight, IconCheck, IconChevronRight } from "@/components/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/koine";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, PageShell } from "@/components/ui/states";
import { apiGet } from "@/lib/api-client";
import { nextReviewIn } from "@/lib/next-review";
import { ensureSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type Loaded = {
  lessons: LessonsListResponse["lessons"];
  dueCount: number;
  nextReviewAt: string | null;
};

export function LearnView() {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | ({ status: "ready" } & Loaded)
  >({
    status: "loading",
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    ensureSession()
      .then(() =>
        Promise.all([
          apiGet("/lessons", lessonsListResponseSchema),
          apiGet(`/today?tz=${encodeURIComponent(tz)}`, todayResponseSchema),
        ]),
      )
      .then(
        ([l, t]) =>
          !cancelled &&
          setState({
            status: "ready",
            lessons: l.lessons,
            dueCount: t.dueCount,
            nextReviewAt: t.nextReviewAt,
          }),
      )
      .catch((err: unknown) => {
        console.error("[learn] could not load", err);
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (state.status === "loading") {
    return (
      <PageShell title="Learn">
        <div role="status" aria-label="Loading lessons">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="gap-3 px-5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-2 h-12 w-full rounded-md" />
            </Card>
            <Card className="gap-3 px-5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-auto h-12 w-full rounded-md" />
            </Card>
          </div>
          <Skeleton className="mt-10 h-3 w-24" />
          <Card className="mt-3 gap-0 py-2">
            <ul className="divide-y divide-border">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <span className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3.5 w-3/5" />
                  </span>
                  <Skeleton className="size-4 shrink-0" />
                </li>
              ))}
            </ul>
          </Card>
          <Skeleton className="mt-6 h-[72px] w-full rounded-2xl" />
        </div>
      </PageShell>
    );
  }
  if (state.status === "error") {
    return (
      <PageShell title="Learn">
        <ErrorState
          message="We couldn’t load your lessons. Please try again."
          onRetry={() => {
            setState({ status: "loading" });
            setAttempt((a) => a + 1);
          }}
        />
      </PageShell>
    );
  }

  const next = state.lessons.find((l) => l.status !== "completed");

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-8 lg:px-14 lg:pt-12">
      <h1 className="font-heading text-[34px] lg:text-[40px]">Learn</h1>

      <div className="animate-[fade-in_150ms_ease-out]">
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {next ? (
            <Card className="gap-3 px-5">
              <SectionLabel>Next lesson · {next.number}</SectionLabel>
              <h2 className="font-heading text-2xl leading-tight">{next.title}</h2>
              <p className="text-muted-foreground">
                {next.passageTitle}
                {next.conceptTitle ? ` · ${next.conceptTitle}` : ""}
              </p>
              <Button asChild className="mt-2 w-full">
                <Link href={`/lesson/${next.id}`}>
                  {next.status === "in_progress" ? "Continue" : "Start"}{" "}
                  <IconArrowRight size={20} />
                </Link>
              </Button>
            </Card>
          ) : (
            <Card className="gap-3 px-5">
              <SectionLabel>Lessons</SectionLabel>
              <h2 className="font-heading text-2xl leading-tight">
                All {state.lessons.length} complete
              </h2>
              <p className="text-muted-foreground">
                Every lesson is done. Rereading a passage is the best way to keep the Greek fresh.
              </p>
              <Button asChild className="mt-auto w-full">
                <Link href="/read">Read a passage again</Link>
              </Button>
            </Card>
          )}
          <Card className="gap-3 px-5">
            <SectionLabel>Review</SectionLabel>
            <p className="font-heading text-4xl">{state.dueCount}</p>
            <p className="text-muted-foreground">
              {state.dueCount === 1 ? "word" : "words"} due now
              {state.dueCount === 0 &&
                state.nextReviewAt &&
                ` · more ${nextReviewIn(new Date(state.nextReviewAt), new Date())}`}
            </p>
            <Button asChild variant="outline" className="mt-auto w-full">
              <Link href="/review">Start review</Link>
            </Button>
          </Card>
        </div>

        <section aria-labelledby="lessons-heading" className="mt-10">
          <SectionLabel>
            <span id="lessons-heading">All lessons</span>
          </SectionLabel>
          <Card className="mt-3 gap-0 py-2">
            <ol className="divide-y divide-border">
              {state.lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/lesson/${l.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-muted"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-xs",
                        l.status === "completed"
                          ? "bg-correct-soft text-correct"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {l.status === "completed" ? (
                        <IconCheck
                          size={16}
                          role="img"
                          aria-label="Completed"
                          aria-hidden={false}
                        />
                      ) : (
                        l.number
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{l.title}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {l.passageTitle}
                        {l.conceptTitle ? ` · ${l.conceptTitle}` : ""}
                      </span>
                    </span>
                    {l.status === "in_progress" && (
                      <span className="font-mono text-xs tracking-[0.08em] text-primary">
                        IN PROGRESS
                      </span>
                    )}
                    <IconChevronRight size={18} className="shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </section>

        <Link
          href="/grammar"
          className="mt-6 flex items-center justify-between rounded-2xl bg-accent px-6 py-5 text-primary hover:opacity-90"
        >
          <span>
            <span className="block font-semibold">Grammar lessons</span>
            <span className="block text-sm">Short, one idea at a time, in reading order</span>
          </span>
          <IconChevronRight size={18} />
        </Link>
      </div>
    </main>
  );
}

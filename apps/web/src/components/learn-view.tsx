"use client";

import {
  lessonsListResponseSchema,
  type LessonsListResponse,
  todayResponseSchema,
} from "@gbt/shared";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/koine";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState, PageShell } from "@/components/ui/states";
import { apiGet } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type Loaded = { lessons: LessonsListResponse["lessons"]; dueCount: number };

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
          !cancelled && setState({ status: "ready", lessons: l.lessons, dueCount: t.dueCount }),
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
        <LoadingState label="Loading lessons…" />
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
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-12 sm:px-6 lg:pt-12">
      <h1 className="font-heading text-5xl">Learn</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {next && (
          <Card className="gap-3 px-6">
            <SectionLabel>Next lesson · {next.number}</SectionLabel>
            <h2 className="font-heading text-2xl leading-tight">{next.title}</h2>
            <p className="text-muted-foreground">
              {next.passageTitle}
              {next.conceptTitle ? ` · ${next.conceptTitle}` : ""}
            </p>
            <Button asChild className="mt-2 w-full">
              <Link href={`/lesson/${next.id}`}>
                {next.status === "in_progress" ? "Continue" : "Start"}{" "}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </Card>
        )}
        <Card className="gap-3 px-6">
          <SectionLabel>Review</SectionLabel>
          <p className="font-heading text-4xl">{state.dueCount}</p>
          <p className="text-muted-foreground">{state.dueCount === 1 ? "word" : "words"} due now</p>
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
                      <Check className="size-4" aria-label="Completed" />
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
                  <ChevronRight
                    className="size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
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
        <ChevronRight aria-hidden="true" />
      </Link>
    </main>
  );
}

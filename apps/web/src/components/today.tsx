"use client";

import {
  type LessonResponse,
  lessonResponseSchema,
  todayResponseSchema,
  type TodayResponse,
} from "@gbt/shared";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SectionLabel, STAGE_MARKS } from "@/components/koine";
import { ErrorState, LoadingState, PageShell } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLocalName } from "@/components/use-preferences";
import { apiGet } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";
import { type StageStatus, stageStatuses } from "@/lib/stages";
import { cn } from "@/lib/utils";

type Loaded = { today: TodayResponse; lesson: LessonResponse["lesson"] | null };

const greeting = (hour: number) =>
  hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

export function Today() {
  const router = useRouter();
  const [name] = useLocalName();
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | ({ status: "ready" } & Loaded)
  >({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    (async () => {
      await ensureSession();
      const today = await apiGet(`/today?tz=${encodeURIComponent(tz)}`, todayResponseSchema);
      if (!today.onboarded) {
        // A late response must not pull the learner back once they have moved on.
        if (!cancelled) router.replace("/welcome");
        return null;
      }
      const lesson = today.lesson
        ? (await apiGet(`/lessons/${today.lesson.id}`, lessonResponseSchema)).lesson
        : null;
      return { today, lesson };
    })()
      .then((loaded) => !cancelled && loaded && setState({ status: "ready", ...loaded }))
      .catch((err: unknown) => {
        console.error("[today] could not load", err);
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  if (state.status === "loading") {
    return (
      <PageShell>
        <LoadingState label="Getting today ready…" />
      </PageShell>
    );
  }
  if (state.status === "error") {
    return (
      <PageShell>
        <ErrorState
          message="We couldn’t load today’s plan. Check your connection and try again."
          onRetry={() => {
            setState({ status: "loading" });
            setAttempt((a) => a + 1);
          }}
        />
      </PageShell>
    );
  }

  const { today: t, lesson } = state;
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const practisedThisWeek = t.practice.week.filter((d) => d.practised).length;
  const doneToday =
    t.lastCompleted && new Date(t.lastCompleted.completedAt).toDateString() === now.toDateString();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-10 sm:px-6 lg:px-12 lg:pt-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>{dateLabel}</SectionLabel>
          <h1 className="mt-2 font-heading text-4xl leading-tight lg:text-5xl">
            {greeting(now.getHours())}
            {name ? `, ${name}` : ""}
          </h1>
        </div>
        {name && (
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold lg:hidden"
          >
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </header>

      <div className="mt-5 flex items-center justify-between gap-4 lg:hidden">
        <p className="text-sm">
          <span className="font-semibold">Day {Math.max(1, t.practice.daysPractised)}</span>
          <span className="text-muted-foreground">
            {" "}
            · {practisedThisWeek} {practisedThisWeek === 1 ? "day" : "days"} this week
          </span>
        </p>
        <WeekDots week={t.practice.week} />
      </div>

      {doneToday && (
        <p
          role="status"
          className="mt-5 flex items-center gap-2 rounded-2xl bg-correct-soft px-4 py-3 text-sm"
        >
          <Check className="size-4 text-correct" aria-hidden="true" />
          Lesson {t.lastCompleted!.number} done today: {t.lastCompleted!.title}.
        </p>
      )}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
        <div className="flex flex-col gap-5">
          {t.lesson && lesson ? (
            <SessionCard today={t} lesson={lesson} doneToday={!!doneToday} />
          ) : (
            <Card className="px-6">
              <p>You’ve finished every lesson so far. Keep reviewing; more passages are coming.</p>
            </Card>
          )}
          {t.passage && t.passageKnown && (
            <Card className="gap-3 px-6">
              <Link href={`/read/${t.passage.id}`} className="flex items-center justify-between">
                <SectionLabel>Continue reading</SectionLabel>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
              </Link>
              <p lang="grc" className="truncate font-greek text-2xl">
                {t.passageKnown.firstLine}…
              </p>
              <div className="flex items-center gap-3 text-sm">
                <span className="shrink-0 text-muted-foreground">{t.passage.title}</span>
                <Progress
                  value={(100 * t.passageKnown.known) / Math.max(1, t.passageKnown.total)}
                  aria-label="Words known in this passage"
                  className="flex-1 [&>[data-slot=progress-indicator]]:bg-correct"
                />
                <span className="shrink-0" data-testid="passage-known">
                  {t.passageKnown.known} of {t.passageKnown.total} words known
                </span>
              </div>
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <Card className="gap-4 px-6">
            <SectionLabel>Your reading so far</SectionLabel>
            <dl className="grid grid-cols-2 gap-3" data-testid="progress">
              <Tile label="words learned" value={t.progress.wordsLearned} />
              <Tile label="Greek words read" value={t.progress.greekWordsRead} />
              <Tile label="passages" value={t.progress.passagesCompleted} />
              <Tile label="grammar concepts" value={t.progress.conceptsStudied} />
            </dl>
          </Card>
          <Card className="gap-3 px-6">
            <Link href="/review" className="flex items-baseline justify-between">
              <SectionLabel>Due for review</SectionLabel>
              <span className="font-mono text-xs text-muted-foreground" data-testid="due-count">
                {t.dueCount}
              </span>
            </Link>
            {t.dueWords.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due right now.</p>
            ) : (
              <ul className="divide-y divide-border">
                {t.dueWords.map((w) => (
                  <li key={w.lemmaId} className="flex items-baseline justify-between gap-3 py-2.5">
                    <span lang="grc" className="font-greek text-xl">
                      {w.lemma}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">{w.gloss}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <p className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/settings" className="hover:text-foreground lg:hidden">
              Settings
            </Link>
            <Link href="/about" className="hover:text-foreground">
              Sources and licences
            </Link>
          </p>
        </aside>
      </div>
    </main>
  );
}

function WeekDots({ week }: { week: TodayResponse["practice"]["week"] }) {
  return (
    <ol aria-label="This week" className="flex gap-2.5">
      {week.map((d) => {
        const letter = new Date(`${d.date}T12:00:00Z`).toLocaleDateString("en-GB", {
          weekday: "narrow",
          timeZone: "UTC",
        });
        return (
          <li key={d.date} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "font-mono text-[11px]",
                d.today ? "font-bold text-foreground" : "text-muted-foreground",
              )}
            >
              {letter}
            </span>
            <span
              aria-label={`${d.date}${d.practised ? ", practised" : ""}${d.today ? ", today" : ""}`}
              className={cn(
                "size-2.5 rounded-full",
                d.practised ? "bg-primary" : d.today ? "border-2 border-primary" : "bg-border",
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}

function SessionCard({
  today: t,
  lesson,
  doneToday,
}: {
  today: TodayResponse;
  lesson: LessonResponse["lesson"];
  doneToday: boolean;
}) {
  const stages = stageStatuses(
    lesson.steps.map((s) => s.kind),
    t.lesson!.currentStep,
  );
  const vocab = lesson.steps.find((s) => s.kind === "vocab");
  const grammar = lesson.steps.find((s) => s.kind === "grammar");
  const detail = (s: StageStatus) =>
    s.key === "review"
      ? `${t.dueCount} ${t.dueCount === 1 ? "word" : "words"}`
      : s.key === "new"
        ? `${vocab?.kind === "vocab" ? vocab.lemmaIds.length : 0} words`
        : s.key === "grammar"
          ? grammar?.kind === "grammar"
            ? grammar.title
            : ""
          : lesson.passage.title;
  const started = t.lesson!.started && t.lesson!.currentStep > 0;

  return (
    <Card className="gap-5 px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-4">
            <SectionLabel>
              {doneToday ? "Up next" : "Today’s session"} · Lesson {lesson.number}
            </SectionLabel>
            {t.dailyMinutes && (
              <span className="font-mono text-xs text-muted-foreground lg:hidden">
                ≈ {t.dailyMinutes} MIN
              </span>
            )}
          </div>
          <p lang="grc" className="mt-3 font-greek text-5xl leading-none">
            {t.passageKnown?.firstLine.split(" ").slice(0, 2).join(" ")}
          </p>
          <h2 className="mt-2 text-[15px] text-muted-foreground">
            <span className="sr-only">{lesson.title}. </span>
            Building up to {lesson.passage.title}
          </h2>
        </div>
        <Button asChild size="lg" className="hidden shrink-0 lg:inline-flex">
          <Link href={`/lesson/${lesson.id}`}>
            {started ? "Continue session" : "Start session"} <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="flex gap-1.5" aria-hidden="true">
        {stages.map((s) => (
          <Progress key={s.key} value={s.progress * 100} className="h-1" />
        ))}
      </div>

      <ol className="flex flex-col divide-y divide-border lg:grid lg:grid-cols-4 lg:gap-3 lg:divide-y-0">
        {stages.map((s, i) => (
          <li
            key={s.key}
            className={cn(
              "flex min-w-0 items-center gap-4 py-3.5 lg:flex-col lg:items-stretch lg:gap-2 lg:rounded-2xl lg:bg-muted lg:p-4",
              s.state === "current" && "lg:bg-accent",
            )}
          >
            <div className="flex items-center justify-between">
              <span lang="grc" className="w-8 font-greek text-xl text-primary">
                {STAGE_MARKS[i]}
              </span>
              <StageBadge state={s.state} className="hidden lg:flex" />
            </div>
            <div className="flex min-w-0 flex-1 items-baseline gap-4 lg:flex-col lg:gap-0.5">
              <span
                className={cn(
                  "w-28 shrink-0 font-semibold lg:w-auto",
                  s.state === "done" && "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
              <span className="truncate text-muted-foreground lg:line-clamp-2 lg:whitespace-normal">
                {detail(s)}
              </span>
            </div>
            <StageBadge state={s.state} className="lg:hidden" />
          </li>
        ))}
      </ol>

      <Button asChild size="lg" className="w-full lg:hidden">
        <Link href={`/lesson/${lesson.id}`}>
          {started ? "Continue session" : "Start session"} <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </Card>
  );
}

function StageBadge({ state, className }: { state: StageStatus["state"]; className?: string }) {
  if (state === "done") {
    return (
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full bg-correct-soft",
          className,
        )}
      >
        <Check className="size-4 text-correct" aria-label="Done" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className={cn("shrink-0 font-mono text-xs tracking-[0.08em] text-primary", className)}>
        NEXT
      </span>
    );
  }
  return null;
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col rounded-2xl bg-muted p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="order-first font-heading text-3xl">{value.toLocaleString("en")}</dd>
    </div>
  );
}

"use client";

import {
  type LessonResponse,
  lessonResponseSchema,
  todayResponseSchema,
  type TodayResponse,
} from "@gbt/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { SectionLabel, STAGE_MARKS } from "@/components/koine";
import { IconArrowRight, IconCheck, IconChevronRight, IconSettings } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useLocalName } from "@/components/use-preferences";
import { apiGet } from "@/lib/api-client";
import { nextReviewIn } from "@/lib/next-review";
import { ensureSession } from "@/lib/session";
import { type StageStatus, stageStatuses } from "@/lib/stages";
import { cn } from "@/lib/utils";

type Loaded = { today: TodayResponse; lesson: LessonResponse["lesson"] | null };

const greeting = (hour: number) =>
  hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

/**
 * Today (design "02 · Today" and "11 · Today — desktop"). The header renders at once; only the
 * session and reading cards wait for data, as skeletons.
 */
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

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-8 lg:max-w-[1192px] lg:px-14 lg:pt-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>
            <span suppressHydrationWarning>{dateLabel}</span>
          </SectionLabel>
          <h1
            className="mt-1.5 font-heading text-[30px] tracking-[-0.01em] lg:mt-2 lg:text-[40px]"
            suppressHydrationWarning
          >
            {greeting(now.getHours())}
            {name ? `, ${name}` : ""}
          </h1>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="pressable flex size-11 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-foreground lg:hidden"
        >
          {name ? name.charAt(0).toUpperCase() : <IconSettings size={20} />}
        </Link>
      </header>

      {state.status === "error" ? (
        <div className="mt-8">
          <ErrorState
            message="We couldn’t load today’s plan. Check your connection and try again."
            onRetry={() => {
              setState({ status: "loading" });
              setAttempt((a) => a + 1);
            }}
          />
        </div>
      ) : state.status === "loading" ? (
        <TodaySkeleton />
      ) : (
        <TodayBody today={state.today} lesson={state.lesson} now={now} />
      )}
    </main>
  );
}

function TodayBody({
  today: t,
  lesson,
  now,
}: {
  today: TodayResponse;
  lesson: LessonResponse["lesson"] | null;
  now: Date;
}) {
  const todayDate = t.practice.week.find((d) => d.today)?.date;
  const elapsed = t.practice.week.filter((d) => !todayDate || d.date <= todayDate);
  const practisedThisWeek = elapsed.filter((d) => d.practised).length;
  const doneToday =
    t.lastCompleted && new Date(t.lastCompleted.completedAt).toDateString() === now.toDateString();

  return (
    <div className="animate-[fade-in_150ms_ease-out]">
      <div className="mt-[18px] mb-4 flex items-center justify-between px-0.5 lg:hidden">
        <p className="text-[13px] text-ink-2">
          <span className="font-semibold text-foreground">
            Day {Math.max(1, t.practice.daysPractised)}
          </span>{" "}
          · {practisedThisWeek} of {elapsed.length} this week
        </p>
        <WeekDots week={t.practice.week} />
      </div>

      {doneToday && (
        <p
          role="status"
          className="mb-3 flex items-center gap-2 rounded-lg bg-correct-soft px-4 py-3 text-sm lg:mt-8 lg:mb-6"
        >
          <IconCheck size={16} className="text-correct" />
          Lesson {t.lastCompleted!.number} done today: {t.lastCompleted!.title}.
        </p>
      )}

      <div
        className={cn(
          "grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6",
          !doneToday && "lg:mt-8",
        )}
      >
        <div className="flex min-w-0 flex-col gap-3 lg:gap-6">
          {t.lesson && lesson ? (
            <SessionCard today={t} lesson={lesson} doneToday={!!doneToday} />
          ) : (
            <Card className="px-5 py-10 lg:rounded-3xl">
              <EmptyState
                variant="plain"
                icon={IconCheck}
                title="Every lesson done"
                actions={
                  t.dueCount > 0 ? (
                    <>
                      <Button asChild size="lg">
                        <Link href="/review">
                          Review {t.dueCount} {t.dueCount === 1 ? "word" : "words"}
                        </Link>
                      </Button>
                      <Button asChild variant="ghost">
                        <Link href="/read">Read a passage again</Link>
                      </Button>
                    </>
                  ) : (
                    <Button asChild size="lg">
                      <Link href="/read">Read a passage again</Link>
                    </Button>
                  )
                }
              >
                You’ve worked through every lesson. Keep your words fresh in review, and reread any
                passage: it gets easier every time.
              </EmptyState>
            </Card>
          )}
          {t.passage && t.passageKnown && <ContinueReading today={t} />}
        </div>

        {/* The design's phone Today stops at the two cards; these are desktop only. */}
        <aside className="hidden flex-col gap-6 lg:flex">
          <Card className="gap-3.5 rounded-3xl px-6 [--card-spacing:--spacing(6)]">
            <SectionLabel>Your reading so far</SectionLabel>
            <dl className="grid grid-cols-2 gap-2.5" data-testid="progress">
              <Tile label="words learned" value={t.progress.wordsLearned} />
              <Tile label="Greek words read" value={t.progress.greekWordsRead} />
              <Tile label="passages" value={t.progress.passagesCompleted} />
              <Tile label="grammar concepts" value={t.progress.conceptsStudied} />
            </dl>
          </Card>
          <Card className="gap-2 rounded-3xl px-6 [--card-spacing:--spacing(6)]">
            <Link href="/review" className="flex items-baseline justify-between">
              <SectionLabel>Due for review</SectionLabel>
              <span className="font-mono text-[11px] text-muted-foreground" data-testid="due-count">
                {t.dueCount}
              </span>
            </Link>
            {t.dueWords.length === 0 ? (
              <EmptyState variant="inline" icon={IconCheck}>
                {t.nextReviewAt
                  ? `Nothing due. The next words come back ${nextReviewIn(new Date(t.nextReviewAt), now)}.`
                  : "Words you learn will show here when they’re due."}
              </EmptyState>
            ) : (
              <ul>
                {t.dueWords.map((w, i) => (
                  <li
                    key={w.lemmaId}
                    className={cn(
                      "flex h-11 items-center justify-between gap-3",
                      i > 0 && "border-t border-border",
                    )}
                  >
                    <span lang="grc" className="font-greek text-[19px]">
                      {w.lemma}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">{w.gloss}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function WeekDots({ week }: { week: TodayResponse["practice"]["week"] }) {
  return (
    <ol aria-label="This week" className="flex gap-3">
      {week.map((d) => {
        const letter = new Date(`${d.date}T12:00:00Z`).toLocaleDateString("en-GB", {
          weekday: "narrow",
          timeZone: "UTC",
        });
        return (
          <li
            key={d.date}
            className={cn(
              "flex flex-col items-center gap-1.5 font-mono text-[10px]",
              d.today ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
          >
            {letter}
            <span
              aria-label={`${d.date}${d.practised ? ", practised" : ""}${d.today ? ", today" : ""}`}
              className={cn(
                "size-2 rounded-full",
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
  const words = vocab?.kind === "vocab" ? vocab.words.filter(Boolean) : [];
  const detail = (s: StageStatus): ReactNode =>
    s.key === "review" ? (
      `${t.dueCount} ${t.dueCount === 1 ? "word" : "words"}`
    ) : s.key === "new" ? (
      <>
        {/* The phone names the words; the desktop tile counts them. */}
        <span lang="grc" className="font-greek text-[15px] lg:hidden">
          {words.slice(0, 3).join(", ")}
          {words.length > 3 ? ` +${words.length - 3}` : ""}
        </span>
        <span className="hidden lg:inline">{words.length} words</span>
      </>
    ) : s.key === "grammar" ? (
      grammar?.kind === "grammar" ? (
        grammar.title
      ) : (
        ""
      )
    ) : (
      lesson.passage.title
    );
  const started = t.lesson!.started && t.lesson!.currentStep > 0;
  const cta = (
    <Button asChild size="lg" className="lg:px-6">
      <Link href={`/lesson/${lesson.id}`}>
        {started ? "Continue session" : "Start session"} <IconArrowRight size={20} />
      </Link>
    </Button>
  );

  return (
    <Card className="gap-0 px-5 lg:rounded-3xl lg:px-7 lg:[--card-spacing:--spacing(7)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <SectionLabel>
              {doneToday ? "Up next" : "Today’s session"} · Lesson {lesson.number}
              {t.dailyMinutes && (
                <span className="hidden lg:inline"> · ≈ {t.dailyMinutes} min</span>
              )}
            </SectionLabel>
            {t.dailyMinutes && (
              <span className="font-mono text-[11px] text-muted-foreground lg:hidden">
                ≈ {t.dailyMinutes} MIN
              </span>
            )}
          </div>
          <p
            lang="grc"
            className="mt-3.5 font-greek text-[34px] leading-[1.05] tracking-[-0.01em] lg:mt-3 lg:text-5xl lg:leading-none"
          >
            {t.passageKnown?.firstLine
              .split(" ")
              .slice(0, 2)
              .join(" ")
              .replace(/[,.;·]$/, "")}
          </p>
          <h2 className="mt-1.5 text-[15px] text-ink-2 lg:mt-2 lg:text-base">
            <span className="sr-only">{lesson.title}. </span>
            Building up to {lesson.passage.title}
          </h2>
        </div>
        <div className="hidden shrink-0 lg:block">{cta}</div>
      </div>

      <div className="mt-[18px] mb-1.5 flex gap-1 lg:mt-6 lg:mb-4 lg:gap-1.5" aria-hidden="true">
        {stages.map((s) => (
          <Progress key={s.key} value={s.progress * 100} />
        ))}
      </div>

      <ol className="flex flex-col lg:grid lg:grid-cols-4 lg:gap-3">
        {stages.map((s, i) => (
          <li
            key={s.key}
            className={cn(
              "flex h-12 min-w-0 items-center gap-3.5 lg:h-auto lg:min-h-28 lg:flex-col lg:items-stretch lg:gap-0 lg:rounded-lg lg:bg-background lg:p-4",
              i > 0 && "border-t border-border lg:border-0",
              s.state === "current" && "lg:bg-accent",
            )}
          >
            <div className="flex w-[22px] items-center justify-between lg:w-auto">
              <span lang="grc" className="font-greek text-base text-primary lg:text-lg">
                {STAGE_MARKS[i]}
              </span>
              <StageBadge state={s.state} className="hidden lg:flex" />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-3.5 lg:mt-auto lg:flex-none lg:flex-col lg:items-start lg:gap-0.5">
              <span
                className={cn(
                  "w-[92px] shrink-0 text-[15px] font-semibold lg:w-auto lg:text-base",
                  s.state === "done" && "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
              <span className="min-w-0 truncate text-sm text-muted-foreground lg:line-clamp-2 lg:whitespace-normal">
                {detail(s)}
              </span>
            </div>
            <StageBadge state={s.state} className="lg:hidden" />
          </li>
        ))}
      </ol>

      <div className="mt-3.5 grid lg:hidden">{cta}</div>
    </Card>
  );
}

function ContinueReading({ today: t }: { today: TodayResponse }) {
  const known = t.passageKnown!;
  return (
    <Link
      href={`/read/${t.passage!.id}`}
      className="pressable block rounded-2xl bg-card px-5 py-[18px] text-foreground shadow-card lg:rounded-3xl lg:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>
          Continue reading<span className="hidden lg:inline"> · {t.passage!.title}</span>
        </SectionLabel>
        <IconChevronRight size={18} className="text-muted-foreground lg:hidden" />
        <span className="hidden text-sm text-ink-2 lg:inline">
          {known.known} of {known.total} words known
        </span>
      </div>
      <p
        lang="grc"
        className="mt-2.5 truncate font-greek text-[19px] leading-[1.45] lg:mt-4 lg:line-clamp-2 lg:text-[26px] lg:leading-[1.6] lg:whitespace-normal"
      >
        {known.firstLine}…
      </p>
      <div className="mt-3 flex items-center gap-3 lg:hidden">
        <span className="shrink-0 text-[13px] text-muted-foreground">{t.passage!.title}</span>
        <Progress
          value={(100 * known.known) / Math.max(1, known.total)}
          aria-label="Words known in this passage"
          className="flex-1 [&>[data-slot=progress-indicator]]:bg-correct"
        />
        <span className="shrink-0 text-[13px] text-ink-2" data-testid="passage-known">
          {known.known} of {known.total} words known
        </span>
      </div>
      <p className="mt-4 hidden items-center gap-2 text-[15px] font-semibold text-primary lg:flex">
        Open reader <IconArrowRight size={18} />
      </p>
    </Link>
  );
}

function StageBadge({ state, className }: { state: StageStatus["state"]; className?: string }) {
  if (state === "done") {
    return (
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full bg-correct-soft text-correct lg:size-[22px]",
          className,
        )}
      >
        <IconCheck size={15} role="img" aria-label="Done" aria-hidden={false} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span
        className={cn(
          "shrink-0 font-mono text-[11px] font-medium tracking-[0.06em] text-primary",
          className,
        )}
      >
        NEXT
      </span>
    );
  }
  return null;
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col rounded-lg bg-background p-3.5">
      <dt className="mt-1.5 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="order-first font-greek text-[28px] leading-none">
        {value.toLocaleString("en")}
      </dd>
    </div>
  );
}

/** Today while it loads: the same cards, rows and tiles as the loaded screen, in outline. */
function TodaySkeleton() {
  return (
    <div role="status" aria-label="Loading today’s plan">
      <div className="mt-[18px] mb-4 flex items-center justify-between px-0.5 lg:hidden">
        <Skeleton className="h-3.5 w-36" />
        <div className="flex gap-3">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-2.5 w-2" />
              <Skeleton className="size-2 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-3 lg:gap-6">
          <div className="rounded-2xl bg-card p-5 shadow-card lg:rounded-3xl lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="mt-3.5 h-[34px] w-36 lg:mt-3 lg:h-12 lg:w-48" />
                <Skeleton className="mt-2 h-4 w-48" />
              </div>
              <Skeleton className="hidden h-14 w-52 rounded-lg lg:block" />
            </div>
            <div className="mt-[18px] mb-1.5 flex gap-1 lg:mt-6 lg:mb-4 lg:gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-1 flex-1 rounded-full" />
              ))}
            </div>
            <div className="lg:hidden">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "flex h-12 items-center gap-3.5",
                    i > 0 && "border-t border-border",
                  )}
                >
                  <Skeleton className="size-4" />
                  <Skeleton className="h-4 w-[76px]" />
                  <Skeleton className="h-3.5 max-w-40 flex-1" />
                </div>
              ))}
              <Skeleton className="mt-3.5 h-14 w-full rounded-lg" />
            </div>
            <div className="hidden grid-cols-4 gap-3 lg:grid">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex min-h-28 flex-col rounded-lg bg-background p-4">
                  <Skeleton className="h-4 w-5 bg-border" />
                  <Skeleton className="mt-auto h-4 w-24 bg-border" />
                  <Skeleton className="mt-1.5 h-3.5 w-16 bg-border" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-card px-5 py-[18px] shadow-card lg:rounded-3xl lg:p-7">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-3 h-6 w-full lg:mt-4 lg:h-8" />
            <Skeleton className="mt-2 hidden h-8 w-3/4 lg:block" />
            <div className="mt-3 flex items-center gap-3 lg:hidden">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-1 flex-1 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="mt-4 hidden h-4 w-28 lg:block" />
          </div>
        </div>
        <div className="hidden flex-col gap-6 lg:flex">
          <div className="rounded-3xl bg-card p-6 shadow-card">
            <Skeleton className="h-3 w-36" />
            <div className="mt-3.5 grid grid-cols-2 gap-2.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg bg-background p-3.5">
                  <Skeleton className="h-7 w-8 bg-border" />
                  <Skeleton className="mt-2 h-3 w-24 bg-border" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-card p-6 shadow-card">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-4" />
            </div>
            <div className="mt-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "flex h-11 items-center justify-between",
                    i > 0 && "border-t border-border",
                  )}
                >
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

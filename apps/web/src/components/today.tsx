"use client";

import { todayResponseSchema, type TodayResponse } from "@gbt/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState, PageShell } from "@/components/ui/states";
import { apiGet } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";

const sameDay = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export function Today() {
  const router = useRouter();
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | { status: "ready"; today: TodayResponse }
  >({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    ensureSession()
      .then(() => apiGet("/today", todayResponseSchema))
      .then((today) => {
        if (cancelled) return;
        if (!today.onboarded) router.replace("/onboarding");
        else setState({ status: "ready", today });
      })
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
      <PageShell title="Today">
        <LoadingState label="Getting today ready…" />
      </PageShell>
    );
  }
  if (state.status === "error") {
    return (
      <PageShell title="Today">
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

  const t = state.today;
  const doneToday = t.lastCompleted && sameDay(t.lastCompleted.completedAt);

  return (
    <PageShell title="Today">
      {doneToday && (
        <p role="status" className="mb-6 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          ✓ Lesson {t.lastCompleted!.number} done today: {t.lastCompleted!.title}.
        </p>
      )}

      {t.lesson ? (
        <section
          aria-labelledby="lesson-heading"
          className="rounded-2xl border border-rule bg-sheet p-5"
        >
          <p className="text-xs tracking-wide text-accent uppercase">
            {doneToday ? "Up next" : "Today’s lesson"} · Lesson {t.lesson.number}
          </p>
          <h2 id="lesson-heading" className="mt-1 font-serif text-2xl">
            {t.lesson.title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t.passage?.title} · {t.lesson.stepCount} steps
            {t.dailyMinutes ? ` · about ${t.dailyMinutes} minutes` : ""}
          </p>
          {t.progress.lessonsCompleted === 0 && (
            <p className="mt-3 text-sm">
              New to Greek letters?{" "}
              <Link href="/grammar/alphabet" className="text-accent underline underline-offset-2">
                Learn the alphabet first
              </Link>
              .
            </p>
          )}
          <Link
            href={`/lesson/${t.lesson.id}`}
            className="mt-4 inline-block rounded-full bg-ink px-6 py-2.5 text-sm text-paper hover:opacity-90"
          >
            {t.lesson.started && t.lesson.currentStep > 0
              ? `Continue lesson (step ${t.lesson.currentStep + 1})`
              : "Start lesson"}
          </Link>
        </section>
      ) : (
        <p className="rounded-2xl border border-rule bg-sheet p-5">
          You’ve finished every lesson so far. Keep reviewing, and more passages are coming.
        </p>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <li>
          <Card href="/review" label="Due for review">
            <span className="font-serif text-2xl" data-testid="due-count">
              {t.dueCount}
            </span>
          </Card>
        </li>
        {t.concept && (
          <li>
            <Card href={`/grammar/${t.concept.slug}`} label="Current grammar">
              {t.concept.title}
            </Card>
          </li>
        )}
        {t.passage && (
          <li>
            <Card href={`/read/${t.passage.id}`} label="Current passage">
              <span className="font-serif text-lg">{t.passage.title}</span>
            </Card>
          </li>
        )}
      </ul>

      <section aria-labelledby="progress-heading" className="mt-8">
        <h2 id="progress-heading" className="font-serif text-lg">
          So far
        </h2>
        <dl
          className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4"
          data-testid="progress"
        >
          <Stat label="Words in review" value={t.progress.wordsInReview} />
          <Stat label="Passages read" value={t.progress.passagesCompleted} />
          <Stat label="Grammar studied" value={t.progress.conceptsStudied} />
          <Stat label="Lessons done" value={t.progress.lessonsCompleted} />
        </dl>
      </section>

      <p className="mt-10 flex gap-4 text-sm text-muted">
        <Link href="/grammar" className="hover:text-ink">
          All grammar lessons
        </Link>
        <Link href="/about" className="hover:text-ink">
          Sources and licences
        </Link>
      </p>
    </PageShell>
  );
}

function Card({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block h-full rounded-xl border border-rule p-4 hover:bg-accent-soft"
    >
      <span className="block text-muted">{label}</span>
      <span className="mt-1 block">{children}</span>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-serif text-xl tabular-nums">{value}</dd>
    </div>
  );
}

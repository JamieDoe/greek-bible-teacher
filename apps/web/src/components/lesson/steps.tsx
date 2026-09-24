"use client";

import {
  grammarConceptResponseSchema,
  type GrammarConceptResponse,
  type LessonStep,
  passageResponseSchema,
  type PassageResponse,
} from "@gbt/shared";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Markdown } from "@/components/grammar/markdown";
import { VerseExample } from "@/components/grammar/verse-example";
import { Reader } from "@/components/reader/reader";
import { ContinueButton } from "@/components/review/review-session";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { apiGet, apiPost } from "@/lib/api-client";
import { splitGoingDeeper } from "@/lib/markdown";

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

/** Fetches once per key, with a retry, keeping each step's loading/error states explicit. */
function useLoad<T>(key: string, load: () => Promise<T>): [Load<T>, () => void] {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; value: Load<T> } | null>(null);
  const requestKey = `${key}#${attempt}`;
  useEffect(() => {
    let cancelled = false;
    load()
      .then(
        (data) => !cancelled && setResult({ key: requestKey, value: { status: "ready", data } }),
      )
      .catch((err: unknown) => {
        console.error(`[lesson] could not load ${key}`, err);
        if (!cancelled) setResult({ key: requestKey, value: { status: "error" } });
      });
    return () => {
      cancelled = true;
    };
    // `load` is recreated each render; the key identifies the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);
  const value = result?.key === requestKey ? result.value : { status: "loading" as const };
  return [value, () => setAttempt((a) => a + 1)];
}

export function ReadingStep({
  passageId,
  heading,
  onFinished,
}: {
  passageId: number;
  heading: string;
  onFinished: (lookedUp: number[]) => void;
}) {
  const [load, retry] = useLoad<PassageResponse["passage"]>(
    `passage-${passageId}`,
    async () => (await apiGet(`/passages/${passageId}`, passageResponseSchema)).passage,
  );
  if (load.status === "loading") return <LoadingState label="Loading the passage…" />;
  if (load.status === "error") {
    return <ErrorState message="We couldn’t load the passage." onRetry={retry} />;
  }
  return <Reader passage={load.data} heading={heading} onFinished={onFinished} />;
}

const progressSchema = z.object({ status: z.string() });

export function GrammarStep({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [load, retry] = useLoad<GrammarConceptResponse["concept"]>(
    `grammar-${slug}`,
    async () => (await apiGet(`/grammar/${slug}`, grammarConceptResponseSchema)).concept,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  if (load.status === "loading") return <LoadingState label="Loading the lesson…" />;
  if (load.status === "error") {
    return <ErrorState message="We couldn’t load this grammar lesson." onRetry={retry} />;
  }
  const concept = load.data;
  const { main } = splitGoingDeeper(concept.body);

  async function studied() {
    setSaving(true);
    setError(false);
    try {
      await apiPost(`/grammar/${slug}/progress`, progressSchema, { status: "studied" });
      onDone();
    } catch (err) {
      console.error("[lesson] could not mark studied", err);
      setError(true);
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="grammar-heading">
      <p className="text-sm tracking-wide text-muted uppercase">Grammar</p>
      <h2 id="grammar-heading" className="mt-1 font-serif text-2xl">
        {concept.title}
      </h2>
      <Markdown source={main} />
      <div className="mt-8 space-y-5">
        {concept.examples.slice(0, 3).map((ex) => (
          <VerseExample key={ex.tokenId} example={ex} />
        ))}
      </div>
      <ContinueButton
        onClick={() => void studied()}
        label={saving ? "Saving…" : "Got it, continue"}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-muted">
          Couldn’t save. Please try again.
        </p>
      )}
    </section>
  );
}

export function InvestigateStep({
  step,
  onDone,
}: {
  step: Extract<LessonStep, { kind: "investigate" }>;
  onDone: () => void;
}) {
  return (
    <section aria-labelledby="investigate-heading">
      <p className="text-sm tracking-wide text-muted uppercase">Look closer</p>
      <h2 id="investigate-heading" className="mt-1 font-serif text-2xl">
        Spot the forms
      </h2>
      <p className="mt-2 text-muted">
        These words in the passage show today’s grammar: {step.conceptTitle.toLowerCase()}.
      </p>
      <div className="mt-6 space-y-8">
        {step.verses.map((v) => (
          <div key={v.displayRef}>
            <VerseExample example={{ ...v, tokenId: 0 }} />
            <ul className="mt-3 space-y-1 text-sm">
              {v.notes.map((n, i) => (
                <li key={i}>
                  <span lang="grc" className="font-greek text-base">
                    {n.word}
                  </span>
                  <span className="text-muted">: </span>
                  {n.note}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <ContinueButton onClick={onDone} />
    </section>
  );
}

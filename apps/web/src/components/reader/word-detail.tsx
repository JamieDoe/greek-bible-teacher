"use client";

import {
  addToReviewResponseSchema,
  type DisclosureLevel,
  disclosureLevels,
  type ReaderToken,
  tokenDetailResponseSchema,
  type TokenDetailResponse,
} from "@gbt/shared";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { IconCheck, IconPlus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiGet, apiPost } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { SpeakButton } from "../speech";

const LEVEL_LABELS: Record<DisclosureLevel, string> = {
  beginner: "Simple",
  expanded: "More",
  advanced: "Full",
};

type DetailState =
  { status: "loading" } | { status: "error" } | { status: "ready"; detail: TokenDetailResponse };

/**
 * What a tapped word shows (design "07 · Word detail"): the word, its dictionary form and
 * meaning, parsing chips, "Why this form?", and add-to-review. Shared by the phone's bottom sheet
 * and the wide reader's side panel. Simple / More / Full is the remembered disclosure level
 * (CLAUDE.md), which the design leaves out.
 */
export function WordDetail({
  token,
  level,
  onLevelChange,
  variant,
  title,
  actions,
  closeButton,
}: {
  token: ReaderToken;
  level: DisclosureLevel;
  onLevelChange: (level: DisclosureLevel) => void;
  variant: "sheet" | "panel";
  /** Renders the word as the dialog's title (the sheet) or a heading (the panel). */
  title: (word: ReactNode, className: string) => ReactNode;
  /** The close control beside the speaker. */
  closeButton: ReactNode;
  /** Extra buttons beside "Add to review" (the sheet's "Back to text"). */
  actions?: ReactNode;
}) {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${token.id}:${attempt}`;
  const [result, setResult] = useState<{ key: string; state: DetailState } | null>(null);
  const detail: DetailState = result?.key === requestKey ? result.state : { status: "loading" };
  const [added, setAdded] = useState<"idle" | "saving" | "added" | "error">("idle");

  useEffect(() => {
    const controller = new AbortController();
    apiGet(`/tokens/${token.id}`, tokenDetailResponseSchema, controller.signal)
      .then((d) => setResult({ key: requestKey, state: { status: "ready", detail: d } }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error("[reader] token lookup failed", err);
        setResult({ key: requestKey, state: { status: "error" } });
      });
    return () => controller.abort();
  }, [token.id, requestKey]);

  async function addToReview() {
    setAdded("saving");
    try {
      await ensureSession();
      await apiPost(`/review/${token.lemma.id}/add`, addToReviewResponseSchema);
      setAdded("added");
    } catch (err) {
      console.error("[reader] could not add to review", err);
      setAdded("error");
    }
  }

  const notes =
    detail.status === "ready"
      ? detail.detail.concepts.filter((c) => c.note !== null).slice(0, 2)
      : [];
  const panel = variant === "panel";

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {title(
            token.word,
            cn(
              "font-greek leading-[1.1] font-normal text-foreground",
              panel ? "text-[52px]" : "text-[40px]",
            ),
          )}
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2.5" data-testid="gloss">
            {level !== "beginner" && (
              <>
                <span lang="grc" className="font-greek text-xl text-ink-2">
                  {token.lemma.lemma}
                </span>
                <span className="text-muted-foreground" aria-hidden="true">
                  ·
                </span>
              </>
            )}
            {token.lemma.gloss ? (
              <span className={cn("font-medium", level === "beginner" ? "text-xl" : "text-[17px]")}>
                {token.lemma.gloss}
              </span>
            ) : (
              <span className="text-muted-foreground">No gloss available yet.</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <SpeakButton text={token.word} label={`Hear ${token.word}`} />
          {closeButton}
        </div>
      </div>

      {level !== "beginner" && (
        <ul className="mt-[18px] flex flex-wrap gap-1.5" aria-label="Parsing">
          {token.morphology.labels.map((label) => (
            <li
              key={label}
              className="inline-flex h-7 items-center rounded-sm bg-muted px-2.5 font-mono text-xs font-medium text-ink-2"
            >
              {label}
            </li>
          ))}
        </ul>
      )}

      {level === "advanced" && (
        <AdvancedDetail token={token} state={detail} onRetry={() => setAttempt((a) => a + 1)} />
      )}

      {notes.length > 0 && (
        <section className="mt-5 rounded-lg bg-accent p-4">
          <h3 className="text-[13px] font-semibold text-primary">Why this form?</h3>
          {notes.map((c) => (
            <p key={c.slug} className="mt-1.5 text-[15px] leading-normal">
              {c.note}{" "}
              <Link
                href={`/grammar/${c.slug}`}
                className="whitespace-nowrap text-primary underline underline-offset-2"
              >
                {c.title}
              </Link>
            </p>
          ))}
        </section>
      )}

      <ToggleGroup
        type="single"
        variant="segmented"
        size="sm"
        aria-label="How much detail to show"
        className="mt-5"
        value={level}
        onValueChange={(v) => v && onLevelChange(v as DisclosureLevel)}
      >
        {disclosureLevels.map((l) => (
          <ToggleGroupItem key={l} value={l}>
            {LEVEL_LABELS[l]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className={cn("mt-4 grid gap-2.5", actions ? "grid-cols-2" : "grid-cols-1")}>
        <Button
          variant="outline"
          onClick={() => void addToReview()}
          disabled={added === "saving" || added === "added"}
        >
          {added === "added" ? (
            <>
              <IconCheck size={18} /> In review
            </>
          ) : (
            <>
              <IconPlus size={18} /> Add to review
            </>
          )}
        </Button>
        {actions}
      </div>
      {added === "error" && (
        <p role="alert" className="mt-2 text-sm text-rubric">
          Couldn’t add it to your review. Please try again.
        </p>
      )}
    </div>
  );
}

function AdvancedDetail({
  token,
  state,
  onRetry,
}: {
  token: ReaderToken;
  state: DetailState;
  onRetry: () => void;
}) {
  const m = token.morphology;
  const features: [string, string | null][] = [
    ["Part of speech", m.labels[0] ?? null],
    ["Tense", m.tense],
    ["Voice", m.voice],
    ["Mood", m.mood],
    ["Person", m.person],
    ["Case", m.case],
    ["Number", m.number],
    ["Gender", m.gender],
    ["Degree", m.degree],
  ];
  return (
    <section className="mt-5 border-t border-border pt-4 text-sm" aria-label="Full analysis">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
        {features
          .filter(([, v]) => v !== null)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="first-letter:uppercase">{v}</dd>
            </div>
          ))}
        <dt className="text-muted-foreground">Parse code</dt>
        <dd className="font-mono text-xs leading-5">
          {m.posCode} {m.parseCode}
        </dd>
      </dl>
      {state.status === "loading" && (
        <div className="mt-3 space-y-2" role="status" aria-label="Loading details">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}
      {state.status === "error" && (
        <p className="mt-3 text-muted-foreground">
          Couldn’t load more details.{" "}
          <button type="button" onClick={onRetry} className="underline underline-offset-2">
            Try again
          </button>
        </p>
      )}
      {state.status === "ready" && (
        <div className="mt-3 animate-[fade-in_150ms_ease-out] space-y-2">
          <p>
            <span className="text-muted-foreground">In the NT: </span>
            {state.detail.lemma.ntFrequency.toLocaleString("en")} times; this form{" "}
            {state.detail.occurrences.sameFormCount.toLocaleString("en")}.
          </p>
          {state.detail.lemma.extendedGloss && (
            <p className="leading-relaxed">{state.detail.lemma.extendedGloss}</p>
          )}
          {state.detail.occurrences.nearby.length > 0 && (
            <p>
              <span className="text-muted-foreground">Also at: </span>
              {state.detail.occurrences.nearby.map((o, i) => (
                <span key={o.tokenId}>
                  {i > 0 && ", "}
                  {o.displayRef}{" "}
                  <span lang="grc" className="font-greek">
                    {o.word}
                  </span>
                </span>
              ))}
            </p>
          )}
          {state.detail.lemma.glossSource && (
            <p className="text-xs text-muted-foreground">Gloss: {state.detail.lemma.glossSource}</p>
          )}
        </div>
      )}
    </section>
  );
}

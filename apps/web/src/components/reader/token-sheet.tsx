"use client";

import {
  type DisclosureLevel,
  disclosureLevels,
  type ReaderToken,
  tokenDetailResponseSchema,
  type TokenDetailResponse,
} from "@gbt/shared";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { apiGet } from "@/lib/api-client";

const LEVEL_LABELS: Record<DisclosureLevel, string> = {
  beginner: "Simple",
  expanded: "More",
  advanced: "Full",
};

const SWIPE_CLOSE_PX = 80;

type DetailState =
  { status: "loading" } | { status: "error" } | { status: "ready"; detail: TokenDetailResponse };

interface Props {
  token: ReaderToken;
  verseRef: string;
  level: DisclosureLevel;
  onLevelChange: (level: DisclosureLevel) => void;
  onClose: () => void;
}

/**
 * Bottom sheet for one word. A native modal <dialog> gives focus containment and Esc handling;
 * tapping the backdrop or swiping the handle down also closes it.
 */
export function TokenSheet({ token, verseRef, level, onLevelChange, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [attempt, setAttempt] = useState(0);
  // Results are keyed by request, so a new token or a retry reads as "loading" until it lands.
  const requestKey = `${token.id}:${attempt}`;
  const [result, setResult] = useState<{ key: string; state: DetailState } | null>(null);
  const detail: DetailState = result?.key === requestKey ? result.state : { status: "loading" };
  const drag = useRef<{ startY: number; dy: number } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden"; // keep the passage exactly where it is underneath
    return () => {
      root.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, []);

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

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { startY: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !panelRef.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY);
    panelRef.current.style.transform = `translateY(${drag.current.dy}px)`;
  }
  function onPointerUp() {
    const dy = drag.current?.dy ?? 0;
    drag.current = null;
    if (panelRef.current) panelRef.current.style.transform = "";
    if (dy > SWIPE_CLOSE_PX) onClose();
  }

  const m = token.morphology;
  const showExpanded = level !== "beginner";
  const showAdvanced = level === "advanced";
  // The two most specific curated notes (the API orders them by rule specificity).
  const notes =
    detail.status === "ready"
      ? detail.detail.concepts.filter((c) => c.note !== null).slice(0, 2)
      : [];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault(); // Esc: close through React state so focus returns to the word
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose(); // click landed on the backdrop
      }}
      className="token-sheet"
    >
      <div
        ref={panelRef}
        className="mx-auto max-h-[80dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-b-0 border-rule bg-sheet px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-ink shadow-[0_-8px_30px_rgb(0_0_0/0.12)] sm:px-8"
      >
        <div
          className="flex cursor-grab touch-none justify-center py-2"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden="true"
        >
          <span className="h-1 w-10 rounded-full bg-rule" />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} lang="grc" className="font-greek text-3xl">
              {token.word}
            </h2>
            <p className="mt-0.5 text-xs text-muted">{verseRef}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-full px-3 py-1 text-sm text-muted hover:bg-accent-soft hover:text-ink"
          >
            Close
          </button>
        </div>

        {/* Beginner: the gloss, large */}
        <p className="mt-4 font-serif text-2xl leading-snug" data-testid="gloss">
          {token.lemma.gloss ?? (
            <span className="text-base text-muted">No gloss available yet.</span>
          )}
        </p>

        {showExpanded && (
          <p className="mt-3 text-sm">
            <span lang="grc" className="font-greek text-lg">
              {token.lemma.lemma}
            </span>
            <span className="text-muted"> · </span>
            <span>{m.labels.join(" · ")}</span>
          </p>
        )}

        {showAdvanced && (
          <AdvancedDetail token={token} state={detail} onRetry={() => setAttempt((a) => a + 1)} />
        )}

        {notes.length > 0 && (
          <section className="mt-5 rounded-lg bg-accent-soft px-4 py-3">
            <h3 className="text-xs font-semibold tracking-wide text-accent uppercase">
              Why this form?
            </h3>
            {notes.map((c) => (
              <p key={c.slug} className="mt-1 text-sm leading-relaxed">
                {c.note}{" "}
                <Link
                  href={`/grammar/${c.slug}`}
                  className="whitespace-nowrap text-accent underline underline-offset-2"
                >
                  {c.title}
                </Link>
              </p>
            ))}
          </section>
        )}

        <fieldset className="mt-6">
          <legend className="sr-only">How much detail to show</legend>
          <div className="inline-flex rounded-full border border-rule p-0.5 text-sm">
            {disclosureLevels.map((l) => (
              <label
                key={l}
                className="cursor-pointer rounded-full px-3 py-1 text-muted has-checked:bg-accent-soft has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-accent"
              >
                <input
                  type="radio"
                  name="disclosure"
                  value={l}
                  checked={level === l}
                  onChange={() => onLevelChange(l)}
                  className="sr-only"
                />
                {LEVEL_LABELS[l]}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </dialog>
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
    <section className="mt-5 border-t border-rule pt-4 text-sm" aria-label="Full analysis">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
        {features
          .filter(([, v]) => v !== null)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="first-letter:uppercase">{v}</dd>
            </div>
          ))}
        <dt className="text-muted">Parse code</dt>
        <dd className="font-mono text-xs leading-5">
          {m.posCode} {m.parseCode}
        </dd>
      </dl>

      {state.status === "loading" && <p className="mt-3 text-muted">Loading details…</p>}
      {state.status === "error" && (
        <p className="mt-3 text-muted">
          Couldn’t load more details.{" "}
          <button type="button" onClick={onRetry} className="underline underline-offset-2">
            Try again
          </button>
        </p>
      )}
      {state.status === "ready" && (
        <div className="mt-3 space-y-2">
          <p>
            <span className="text-muted">In the NT: </span>
            {state.detail.lemma.ntFrequency.toLocaleString("en")} times; this form{" "}
            {state.detail.occurrences.sameFormCount.toLocaleString("en")}.
          </p>
          {state.detail.lemma.extendedGloss && (
            <p className="leading-relaxed">{state.detail.lemma.extendedGloss}</p>
          )}
          {state.detail.occurrences.nearby.length > 0 && (
            <p>
              <span className="text-muted">Also at: </span>
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
            <p className="text-xs text-muted">Gloss: {state.detail.lemma.glossSource}</p>
          )}
        </div>
      )}
    </section>
  );
}

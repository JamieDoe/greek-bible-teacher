"use client";

import {
  addToReviewResponseSchema,
  type DisclosureLevel,
  disclosureLevels,
  type ReaderToken,
  tokenDetailResponseSchema,
  type TokenDetailResponse,
} from "@gbt/shared";
import { Check, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiGet, apiPost } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";
import { SpeakButton } from "../speech";

const LEVEL_LABELS: Record<DisclosureLevel, string> = {
  beginner: "Simple",
  expanded: "More",
  advanced: "Full",
};

type DetailState =
  { status: "loading" } | { status: "error" } | { status: "ready"; detail: TokenDetailResponse };

interface Props {
  /** The word being looked up; null closes the sheet. */
  token: ReaderToken | null;
  verseRef: string;
  level: DisclosureLevel;
  onLevelChange: (level: DisclosureLevel) => void;
  onClose: () => void;
  /** Where focus returns when the sheet closes (the tapped word), without scrolling. */
  returnFocus: () => HTMLElement | null | undefined;
}

/**
 * The word sheet: a bottom Drawer (vaul) that answers "what is this word?" in one glance and
 * reveals more on request. Esc, tapping outside and swiping down all close it.
 */
export function WordSheet({ token, verseRef, level, onLevelChange, onClose, returnFocus }: Props) {
  return (
    <Drawer open={token !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent
        aria-describedby={undefined}
        onCloseAutoFocus={(e) => {
          e.preventDefault(); // Radix would focus the page; return to the word instead.
          returnFocus()?.focus({ preventScroll: true });
        }}
      >
        {token && (
          <SheetBody
            key={token.id}
            token={token}
            verseRef={verseRef}
            level={level}
            onLevelChange={onLevelChange}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function SheetBody({
  token,
  verseRef,
  level,
  onLevelChange,
}: Omit<Props, "token" | "onClose" | "returnFocus"> & { token: ReaderToken }) {
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

  const m = token.morphology;
  const notes =
    detail.status === "ready"
      ? detail.detail.concepts.filter((c) => c.note !== null).slice(0, 2)
      : [];

  return (
    <div className="overflow-y-auto px-6 pt-4 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <DrawerTitle lang="grc" className="font-greek text-5xl leading-tight font-normal">
            {token.word}
          </DrawerTitle>
          <DrawerDescription className="sr-only">{verseRef}</DrawerDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <SpeakButton text={token.word} label={`Hear ${token.word}`} />
          <DrawerClose asChild>
            <Button variant="secondary" size="icon" aria-label="Close">
              <X aria-hidden="true" />
            </Button>
          </DrawerClose>
        </div>
      </div>

      <p className="mt-1 text-lg" data-testid="gloss">
        {level !== "beginner" && (
          <>
            <span lang="grc" className="font-greek text-muted-foreground">
              {token.lemma.lemma}
            </span>
            <span className="text-muted-foreground"> · </span>
          </>
        )}
        {token.lemma.gloss ? (
          <span className={level === "beginner" ? "font-heading text-2xl" : "font-semibold"}>
            {token.lemma.gloss}
          </span>
        ) : (
          <span className="text-base text-muted-foreground">No gloss available yet.</span>
        )}
      </p>
      <p className="mt-1 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
        {verseRef}
      </p>

      {level !== "beginner" && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Parsing">
          {m.labels.map((label) => (
            <li key={label}>
              <Badge variant="parsing">{label}</Badge>
            </li>
          ))}
        </ul>
      )}

      {level === "advanced" && (
        <AdvancedDetail token={token} state={detail} onRetry={() => setAttempt((a) => a + 1)} />
      )}

      {notes.length > 0 && (
        <section className="mt-5 rounded-2xl bg-accent px-5 py-4">
          <h3 className="font-semibold text-primary">Why this form?</h3>
          {notes.map((c) => (
            <p key={c.slug} className="mt-1 leading-relaxed">
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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="default"
          onClick={() => void addToReview()}
          disabled={added === "saving" || added === "added"}
        >
          {added === "added" ? (
            <>
              <Check aria-hidden="true" /> In review
            </>
          ) : (
            <>
              <Plus aria-hidden="true" /> Add to review
            </>
          )}
        </Button>
        <DrawerClose asChild>
          <Button variant="ink">Back to text</Button>
        </DrawerClose>
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
      {state.status === "loading" && <p className="mt-3 text-muted-foreground">Loading details…</p>}
      {state.status === "error" && (
        <p className="mt-3 text-muted-foreground">
          Couldn’t load more details.{" "}
          <button type="button" onClick={onRetry} className="underline underline-offset-2">
            Try again
          </button>
        </p>
      )}
      {state.status === "ready" && (
        <div className="mt-3 space-y-2">
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

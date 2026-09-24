"use client";

import { readingCompleteResponseSchema } from "@gbt/shared";
import Link from "next/link";
import { useState } from "react";
import { apiPost } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";

type State =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "error" }
  | { status: "done"; timesRead: number };

/**
 * End of the passage: records the read-through, then offers a review of the words looked up
 * and a fresh re-read.
 */
export function FinishPassage({
  passageId,
  lookedUpLemmaIds,
  onReadAgain,
}: {
  passageId: number;
  lookedUpLemmaIds: number[];
  onReadAgain: () => void;
}) {
  const [state, setState] = useState<State>({ status: "idle" });

  async function finish() {
    setState({ status: "saving" });
    try {
      await ensureSession();
      const res = await apiPost(`/reading/${passageId}/complete`, readingCompleteResponseSchema);
      setState({ status: "done", timesRead: res.timesRead });
    } catch (err) {
      console.error("[reader] could not record completion", err);
      setState({ status: "error" });
    }
  }

  if (state.status !== "done") {
    return (
      <div className="mt-12 flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={finish}
          disabled={state.status === "saving"}
          className="rounded-full bg-ink px-6 py-2.5 text-sm text-paper hover:opacity-90 disabled:opacity-60"
        >
          {state.status === "saving" ? "Saving…" : "Finish passage"}
        </button>
        {state.status === "error" && (
          <p role="alert" className="text-sm text-muted">
            Couldn’t save your progress. Please try again.
          </p>
        )}
      </div>
    );
  }

  const n = lookedUpLemmaIds.length;
  return (
    <section
      aria-labelledby="finished-heading"
      className="mt-12 rounded-2xl border border-rule bg-sheet px-5 py-5"
      tabIndex={-1}
      ref={(el) => el?.focus()}
    >
      <h2 id="finished-heading" className="font-serif text-xl">
        Passage complete
      </h2>
      <p className="mt-1 text-sm text-muted">
        {state.timesRead === 1 ? "First read-through." : `Read ${state.timesRead} times.`}{" "}
        {n === 0
          ? "You didn’t look anything up."
          : `You looked up ${n} ${n === 1 ? "word" : "words"}.`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {n > 0 && (
          <Link
            href={`/review?lemmas=${lookedUpLemmaIds.join(",")}`}
            className="rounded-full bg-ink px-5 py-2 text-paper hover:opacity-90"
          >
            Review {n === 1 ? "it" : `these ${n}`}
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            setState({ status: "idle" });
            onReadAgain();
          }}
          className="rounded-full border border-rule px-5 py-2 hover:bg-accent-soft"
        >
          Read again
        </button>
      </div>
    </section>
  );
}

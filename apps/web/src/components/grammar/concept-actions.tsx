"use client";

import type { GrammarProgressStatus } from "@gbt/shared";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiPost } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";
import { useSession } from "../use-session";
import { Markdown } from "./markdown";

const progressSchema = z.object({ status: z.enum(["introduced", "studied"]) });

/** "Going deeper" terminology: open by default for learners who chose More or Full detail. */
export function DeeperSection({ source }: { source: string }) {
  const { level, ready } = useSession();
  return (
    <details
      key={ready ? level : "loading"}
      open={ready && level !== "beginner"}
      className="mt-8 rounded-xl border border-rule px-4 py-3"
    >
      <summary className="cursor-pointer font-serif text-lg">Going deeper: terminology</summary>
      <Markdown source={source} />
    </details>
  );
}

/** Records that the concept was opened, and lets the learner mark it as studied. */
export function StudyButton({ slug }: { slug: string }) {
  const [status, setStatus] = useState<GrammarProgressStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureSession()
      .then(() => apiPost(`/grammar/${slug}/progress`, progressSchema, { status: "introduced" }))
      .then((r) => !cancelled && setStatus(r.status))
      .catch((err: unknown) => console.error("[grammar] could not record progress", err));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function markStudied() {
    setError(false);
    try {
      await ensureSession();
      const r = await apiPost(`/grammar/${slug}/progress`, progressSchema, { status: "studied" });
      setStatus(r.status);
    } catch (err) {
      console.error("[grammar] could not mark studied", err);
      setError(true);
    }
  }

  if (status === "studied") {
    return (
      <p role="status" className="text-sm text-accent">
        ✓ Studied
      </p>
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={markStudied}
        className="rounded-full bg-ink px-5 py-2 text-sm text-paper hover:opacity-90"
      >
        Mark as studied
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-muted">
          Couldn’t save. Please try again.
        </p>
      )}
    </div>
  );
}

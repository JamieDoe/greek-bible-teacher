"use client";

import { type GrammarConceptSummary, grammarProgressResponseSchema } from "@gbt/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";

export function ConceptList({ concepts }: { concepts: GrammarConceptSummary[] }) {
  const [studied, setStudied] = useState<Set<string>>(new Set());

  useEffect(() => {
    ensureSession()
      .then(() => apiGet("/grammar/progress", grammarProgressResponseSchema))
      .then((r) =>
        setStudied(new Set(r.progress.filter((p) => p.status === "studied").map((p) => p.slug))),
      )
      .catch((err: unknown) => console.error("[grammar] could not load progress", err));
  }, []);

  return (
    <ol className="divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.12)]">
      {concepts.map((c) => (
        <li key={c.slug}>
          <Link href={`/grammar/${c.slug}`} className="flex gap-4 px-6 py-4 hover:bg-muted">
            <span className="w-6 shrink-0 pt-1 text-right font-mono text-xs text-muted-foreground tabular-nums">
              {c.curriculumOrder}
            </span>
            <span className="flex-1">
              <span className="block font-heading text-xl">{c.title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{c.summarySimple}</span>
            </span>
            {studied.has(c.slug) && (
              <span className="shrink-0 pt-1 text-sm text-correct" aria-label="Studied">
                ✓
              </span>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}

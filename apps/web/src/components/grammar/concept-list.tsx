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
    <ol className="divide-y divide-rule border-y border-rule">
      {concepts.map((c) => (
        <li key={c.slug}>
          <Link href={`/grammar/${c.slug}`} className="flex gap-4 py-4 hover:text-accent">
            <span className="w-6 shrink-0 pt-0.5 text-right text-sm text-muted tabular-nums">
              {c.curriculumOrder}
            </span>
            <span className="flex-1">
              <span className="block font-serif text-lg">{c.title}</span>
              <span className="mt-0.5 block text-sm text-muted">{c.summarySimple}</span>
            </span>
            {studied.has(c.slug) && (
              <span className="shrink-0 pt-1 text-xs text-accent" aria-label="Studied">
                ✓
              </span>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}

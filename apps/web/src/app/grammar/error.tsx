"use client";

import { useEffect } from "react";
import { ErrorState, PageShell } from "@/components/ui/states";

export default function GrammarError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[grammar] failed to load", error);
  }, [error]);
  return (
    <PageShell title="Grammar">
      <ErrorState message="We couldn’t load this lesson. Please try again." onRetry={retry} />
    </PageShell>
  );
}

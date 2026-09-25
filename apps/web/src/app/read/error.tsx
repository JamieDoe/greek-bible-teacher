"use client";

import { useEffect } from "react";
import { ErrorState, PageShell } from "@/components/ui/states";

export default function ReadError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[read] failed to load", error);
  }, [error]);
  return (
    <PageShell>
      <ErrorState
        message="We couldn’t load this text. Check your connection and try again."
        onRetry={retry}
      />
    </PageShell>
  );
}

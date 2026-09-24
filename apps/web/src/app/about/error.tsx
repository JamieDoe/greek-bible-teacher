"use client";

import { useEffect } from "react";
import { ErrorState, PageShell } from "@/components/ui/states";

export default function AboutError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[about] failed to load sources", error);
  }, [error]);
  return (
    <PageShell title="Sources and licences">
      <ErrorState message="We couldn’t load the source list. Please try again." onRetry={retry} />
    </PageShell>
  );
}

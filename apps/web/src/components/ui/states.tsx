import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Shared shells for loading, empty and error states, so every data view has all three. */
export function PageShell({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-8 lg:px-14 lg:pt-12">
      {title && <h1 className="mb-5 font-heading text-[34px] lg:text-[40px]">{title}</h1>}
      {children}
    </main>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="space-y-4">
      <p>{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * A list's shape while it loads: rows in a card. `numbered` rows mirror the grammar list (number,
 * title and summary); plain rows mirror the passage list (a title and a chevron).
 */
export function ListSkeleton({
  rows = 5,
  label,
  numbered = false,
}: {
  rows?: number;
  label: string;
  numbered?: boolean;
}) {
  const widths = ["w-2/5", "w-1/2", "w-1/3", "w-3/5", "w-2/5", "w-1/2", "w-1/3", "w-2/5"];
  return (
    <ul
      role="status"
      aria-label={label}
      className="divide-y divide-border rounded-2xl bg-card py-1 shadow-card"
    >
      {Array.from({ length: rows }, (_, i) =>
        numbered ? (
          <li key={i} className="flex gap-4 px-5 py-4">
            <Skeleton className="mt-1.5 ml-auto h-3 w-4 shrink-0" />
            <span className="flex-1">
              <Skeleton className={`h-6 ${widths[i % widths.length]}`} />
              <Skeleton className="mt-2 h-3.5 w-4/5" />
            </span>
          </li>
        ) : (
          <li key={i} className="flex min-h-14 items-center justify-between px-5 py-3">
            <Skeleton className={`h-6 ${widths[i % widths.length]}`} />
            <Skeleton className="size-4" />
          </li>
        ),
      )}
    </ul>
  );
}

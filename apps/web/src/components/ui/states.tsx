import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Shared shells for loading, empty and error states, so every data view has all three. */
export function PageShell({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-8 lg:px-14 lg:pt-12">
      {title && <h1 className="mb-5 font-heading text-[34px] lg:text-[40px]">{title}</h1>}
      {children}
    </main>
  );
}

type Icon = (props: { size?: number; className?: string }) => ReactNode;

/**
 * What a screen shows when there is nothing there yet: what it is, why it's empty, and what to
 * do next. Quiet, like the rest of the design: an icon on a lapis tint, a serif title, a line of
 * explanation and at most two actions.
 * - `card`: a whole screen's content, in a card.
 * - `plain`: the same, unframed, inside a card or step that already frames it.
 * - `inline`: one line with a small icon, for a corner of a card.
 */
export function EmptyState({
  icon: Icon,
  title,
  children,
  actions,
  variant = "card",
  headingLevel = 2,
}: {
  icon?: Icon;
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
  variant?: "card" | "plain" | "inline";
  /** 1 when the empty state is the whole page (a not-found page). */
  headingLevel?: 1 | 2 | 3;
}) {
  if (variant === "inline") {
    return (
      <p className="flex animate-[fade-in_150ms_ease-out] items-start gap-2.5 text-sm leading-snug text-ink-2">
        {Icon && (
          <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <Icon size={12} />
          </span>
        )}
        <span>{children}</span>
      </p>
    );
  }
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      className={cn(
        "flex animate-[fade-in_150ms_ease-out] flex-col items-center text-center",
        variant === "card" && "rounded-2xl bg-card px-6 py-10 shadow-card",
      )}
    >
      {Icon && (
        <span className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
          <Icon size={26} />
        </span>
      )}
      {title && (
        <Heading className={cn("font-heading text-2xl leading-tight", Icon && "mt-4")}>
          {title}
        </Heading>
      )}
      {children && (
        <div className="mt-2 max-w-sm text-[15px] leading-normal text-ink-2">{children}</div>
      )}
      {actions && <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5">{actions}</div>}
    </div>
  );
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

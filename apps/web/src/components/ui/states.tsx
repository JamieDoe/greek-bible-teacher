import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Shared shells for loading, empty and error states, so every data view has all three. */
export function PageShell({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-12 sm:px-6 lg:pt-12">
      {title && <h1 className="mb-6 font-heading text-5xl">{title}</h1>}
      {children}
    </main>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <p role="status" className="animate-pulse text-muted-foreground">
      {label}
    </p>
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

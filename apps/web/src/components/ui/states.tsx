import type { ReactNode } from "react";

/** Shared shells for loading, empty and error states, so every data view has all three. */
export function PageShell({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-10 pb-16 sm:px-8">
      {title && <h1 className="mb-6 font-serif text-3xl">{title}</h1>}
      {children}
    </main>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <p role="status" className="animate-pulse text-muted">
      {label}
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-muted">{children}</p>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="space-y-3">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-rule px-4 py-1.5 text-sm hover:bg-accent-soft"
        >
          Try again
        </button>
      )}
    </div>
  );
}

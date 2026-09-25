import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/ui/states";

const LINES = ["w-full", "w-11/12", "w-full", "w-3/5"];

/** A grammar lesson's shape while it loads: heading, summary, the lesson text and examples. */
export default function Loading() {
  return (
    <PageShell>
      <div role="status" aria-label="Loading the lesson">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="mt-3 h-9 w-3/4" />
        <Skeleton className="mt-3.5 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <div className="mt-5 rounded-2xl bg-card p-5 shadow-card">
          {[0, 1].map((p) => (
            <div key={p} className={p > 0 ? "mt-6" : undefined}>
              {LINES.map((w, i) => (
                <Skeleton key={i} className={`mt-2.5 h-4 first:mt-0 ${w}`} />
              ))}
            </div>
          ))}
        </div>
        <Skeleton className="mt-10 h-7 w-56" />
        {[0, 1].map((i) => (
          <div key={i} className="mt-5 rounded-2xl bg-muted px-5 py-4">
            <Skeleton className="h-6 w-11/12 bg-border" />
            <Skeleton className="mt-3 h-6 w-3/5 bg-border" />
            <Skeleton className="mt-3 h-3 w-20 bg-border" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}

import { sourcesResponseSchema } from "@gbt/shared";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageShell } from "@/components/ui/states";
import { serverGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Sources" };

/** The introduction and typeface credits show at once; only the data sources wait. */
export default function AboutPage() {
  return (
    <PageShell title="Sources and licences">
      <p className="mb-8 leading-relaxed text-ink-2">
        The Greek text, its analysis and the English glosses come from openly licensed scholarly
        datasets. We’re grateful to their editors.
      </p>
      <Suspense fallback={<SourcesSkeleton />}>
        <Sources />
      </Suspense>
      <section className="mt-10 border-t border-border pt-6">
        <h2 className="font-heading text-xl">Typeface</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Greek and headings are set in Literata (The Literata Project Authors); the interface in
          Geist and Geist Mono (The Geist Project Authors). All are licensed under the SIL Open Font
          License 1.1.
        </p>
      </section>
    </PageShell>
  );
}

async function Sources() {
  const { sources } = await serverGet("/sources", sourcesResponseSchema);
  if (sources.length === 0) return <EmptyState>No data sources have been imported yet.</EmptyState>;
  return (
    <ul className="space-y-8">
      {sources.map((s) => (
        <li key={s.key}>
          <h2 className="font-heading text-xl">{s.name}</h2>
          <p className="mt-1 text-sm">
            <span className="text-muted-foreground">Licence:</span> {s.licence}
            {s.version && <span className="text-muted-foreground"> · {s.version}</span>}
          </p>
          <p className="mt-2 text-sm leading-relaxed">{s.attribution}</p>
          {s.url && (
            <a
              href={s.url}
              className="mt-1 inline-block text-sm text-primary underline underline-offset-2"
            >
              {s.url}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function SourcesSkeleton() {
  return (
    <div role="status" aria-label="Loading sources" className="space-y-8">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

import { sourcesResponseSchema } from "@gbt/shared";
import type { Metadata } from "next";
import { EmptyState, PageShell } from "@/components/ui/states";
import { serverGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Sources" };

export default async function AboutPage() {
  const { sources } = await serverGet("/sources", sourcesResponseSchema);
  return (
    <PageShell title="Sources and licences">
      <p className="mb-8 leading-relaxed text-muted-foreground">
        The Greek text, its analysis and the English glosses come from openly licensed scholarly
        datasets. We’re grateful to their editors.
      </p>
      {sources.length === 0 ? (
        <EmptyState>No data sources have been imported yet.</EmptyState>
      ) : (
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
      )}
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

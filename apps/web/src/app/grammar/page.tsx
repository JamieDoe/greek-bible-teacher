import { grammarListResponseSchema } from "@gbt/shared";
import type { Metadata } from "next";
import { ConceptList } from "@/components/grammar/concept-list";
import { EmptyState, PageShell } from "@/components/ui/states";
import { serverGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Grammar" };

export default async function GrammarPage() {
  const { concepts } = await serverGet("/grammar", grammarListResponseSchema);
  return (
    <PageShell title="Grammar">
      <p className="mb-6 text-muted">Short lessons, in the order you’ll need them for reading.</p>
      {concepts.length === 0 ? (
        <EmptyState>No grammar lessons are available yet.</EmptyState>
      ) : (
        <ConceptList concepts={concepts} />
      )}
    </PageShell>
  );
}

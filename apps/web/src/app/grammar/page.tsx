import { grammarListResponseSchema } from "@gbt/shared";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ConceptList } from "@/components/grammar/concept-list";
import { IconLearn } from "@/components/icons";
import { EmptyState, ListSkeleton, PageShell } from "@/components/ui/states";
import { serverGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Grammar" };

/** The heading shows at once; only the list waits for the API. */
export default function GrammarPage() {
  return (
    <PageShell title="Grammar">
      <p className="-mt-2 mb-5 text-ink-2">
        Short lessons, in the order you’ll need them for reading.
      </p>
      <Suspense fallback={<ListSkeleton rows={8} numbered label="Loading grammar lessons" />}>
        <Concepts />
      </Suspense>
    </PageShell>
  );
}

async function Concepts() {
  const { concepts } = await serverGet("/grammar", grammarListResponseSchema);
  if (concepts.length === 0) {
    return (
      <EmptyState icon={IconLearn} title="No grammar lessons yet">
        Grammar lessons appear here once they have been added.
      </EmptyState>
    );
  }
  return <ConceptList concepts={concepts} />;
}

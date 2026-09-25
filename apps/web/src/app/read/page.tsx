import { passagesResponseSchema } from "@gbt/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IconChevronRight, IconRead } from "@/components/icons";
import { EmptyState, ListSkeleton, PageShell } from "@/components/ui/states";
import { serverGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Read" };

/** The heading shows at once; only the list waits for the API. */
export default function ReadPage() {
  return (
    <PageShell title="Read">
      <p className="-mt-2 mb-5 text-ink-2">Passages chosen for learners, easiest first.</p>
      <Suspense fallback={<ListSkeleton rows={6} label="Loading passages" />}>
        <PassageList />
      </Suspense>
    </PageShell>
  );
}

async function PassageList() {
  const { passages } = await serverGet("/passages", passagesResponseSchema);
  if (passages.length === 0) {
    return (
      <EmptyState icon={IconRead} title="No passages yet">
        Passages to read appear here once the reading list has been added.
      </EmptyState>
    );
  }
  return (
    <ul className="animate-[fade-in_150ms_ease-out] rounded-2xl bg-card py-1 shadow-card">
      {passages.map((p, i) => (
        <li key={p.id} className={i > 0 ? "border-t border-border" : undefined}>
          <Link
            href={`/read/${p.id}`}
            className="flex min-h-14 items-center justify-between px-5 py-3 hover:bg-muted"
          >
            <span className="font-heading text-xl">{p.title}</span>
            <IconChevronRight size={18} className="text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

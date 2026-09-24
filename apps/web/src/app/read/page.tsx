import { passagesResponseSchema } from "@gbt/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageShell } from "@/components/ui/states";
import { serverGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Read" };

export default async function ReadPage() {
  const { passages } = await serverGet("/passages", passagesResponseSchema);
  return (
    <PageShell title="Read">
      {passages.length === 0 ? (
        <EmptyState>No passages are available yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {passages.map((p) => (
            <li key={p.id}>
              <Link
                href={`/read/${p.id}`}
                className="flex items-baseline justify-between py-4 hover:text-accent"
              >
                <span className="font-serif text-xl">{p.title}</span>
                <span className="text-sm text-muted">Read →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

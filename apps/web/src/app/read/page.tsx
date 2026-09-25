import { passagesResponseSchema } from "@gbt/shared";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState, PageShell } from "@/components/ui/states";
import { serverGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Read" };

export default async function ReadPage() {
  const { passages } = await serverGet("/passages", passagesResponseSchema);
  return (
    <PageShell title="Read">
      <p className="-mt-2 mb-6 text-muted-foreground">
        Passages chosen for learners, easiest first.
      </p>
      {passages.length === 0 ? (
        <EmptyState>No passages are available yet.</EmptyState>
      ) : (
        <Card className="gap-0 py-2">
          <ul className="divide-y divide-border">
            {passages.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/read/${p.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted"
                >
                  <span className="font-heading text-xl">{p.title}</span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PageShell>
  );
}

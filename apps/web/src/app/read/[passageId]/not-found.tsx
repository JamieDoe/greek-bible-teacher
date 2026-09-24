import Link from "next/link";
import { EmptyState, PageShell } from "@/components/ui/states";

export default function PassageNotFound() {
  return (
    <PageShell title="Passage not found">
      <EmptyState>
        That passage doesn’t exist.{" "}
        <Link href="/read" className="underline underline-offset-2">
          Choose another
        </Link>
        .
      </EmptyState>
    </PageShell>
  );
}

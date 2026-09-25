import Link from "next/link";
import { EmptyState, PageShell } from "@/components/ui/states";

export default function ConceptNotFound() {
  return (
    <PageShell title="Lesson not found">
      <EmptyState>
        That grammar lesson doesn’t exist.{" "}
        <Link href="/grammar" className="underline underline-offset-2">
          See all lessons
        </Link>
        .
      </EmptyState>
    </PageShell>
  );
}

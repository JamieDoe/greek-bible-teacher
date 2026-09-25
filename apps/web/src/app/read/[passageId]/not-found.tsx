import Link from "next/link";
import { IconRead } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { EmptyState, PageShell } from "@/components/ui/states";

export default function PassageNotFound() {
  return (
    <PageShell>
      <EmptyState
        icon={IconRead}
        title="Passage not found"
        headingLevel={1}
        actions={
          <Button asChild size="lg">
            <Link href="/read">See all passages</Link>
          </Button>
        }
      >
        That passage isn’t in the reading list. The link may be out of date.
      </EmptyState>
    </PageShell>
  );
}

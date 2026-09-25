import Link from "next/link";
import { IconLearn } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { EmptyState, PageShell } from "@/components/ui/states";

export default function ConceptNotFound() {
  return (
    <PageShell>
      <EmptyState
        icon={IconLearn}
        title="Lesson not found"
        headingLevel={1}
        actions={
          <Button asChild size="lg">
            <Link href="/grammar">See all grammar lessons</Link>
          </Button>
        }
      >
        That grammar lesson doesn’t exist. The link may be out of date.
      </EmptyState>
    </PageShell>
  );
}

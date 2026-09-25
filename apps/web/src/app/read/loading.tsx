import { LoadingState, PageShell } from "@/components/ui/states";

export default function Loading() {
  return (
    <PageShell>
      <LoadingState label="Loading…" />
    </PageShell>
  );
}

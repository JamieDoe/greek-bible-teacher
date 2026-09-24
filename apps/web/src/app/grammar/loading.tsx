import { LoadingState, PageShell } from "@/components/ui/states";

export default function Loading() {
  return (
    <PageShell title="Grammar">
      <LoadingState label="Loading…" />
    </PageShell>
  );
}

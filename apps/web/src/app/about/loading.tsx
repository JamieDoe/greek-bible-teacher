import { LoadingState, PageShell } from "@/components/ui/states";

export default function Loading() {
  return (
    <PageShell title="Sources and licences">
      <LoadingState label="Loading sources…" />
    </PageShell>
  );
}

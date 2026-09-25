import type { Metadata } from "next";
import { SavedPassages } from "@/components/saved-passages";
import { PageShell } from "@/components/ui/states";

export const metadata: Metadata = { title: "Offline" };

/** Served by the service worker when a page isn't available without a connection. */
export default function OfflinePage() {
  return (
    <PageShell title="You’re offline">
      <p className="mb-6 text-muted-foreground">This page needs a connection.</p>
      <SavedPassages />
    </PageShell>
  );
}

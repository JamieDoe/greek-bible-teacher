import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The design's mono uppercase label, e.g. "DAILY PRACTICE", "TODAY'S SESSION". */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Greek ordinal markers used for session stages: α′ β′ γ′ δ′. */
export const STAGE_MARKS = ["α′", "β′", "γ′", "δ′"] as const;

/** Inner-screen header: back chevron and a title (Settings, grammar lessons…). */
export function ScreenHeader({ title, back = "/" }: { title: string; back?: string }) {
  return (
    <header className="mb-6 flex items-center gap-2">
      <Link
        href={back}
        aria-label="Back"
        className="-ml-2 inline-flex size-11 items-center justify-center rounded-xl hover:bg-muted"
      >
        <ChevronLeft className="size-6" aria-hidden="true" />
      </Link>
      <h1 className="text-xl font-semibold">{title}</h1>
    </header>
  );
}

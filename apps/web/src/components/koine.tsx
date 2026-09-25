import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The design's mono uppercase label, e.g. "DAILY PRACTICE", "TODAY'S SESSION". */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Greek ordinal markers used for session stages: α′ β′ γ′ δ′. */
export const STAGE_MARKS = ["α′", "β′", "γ′", "δ′"] as const;

/**
 * A stage label such as "β′ · New word": the Greek ordinal stays lower case (and in Literata)
 * while the rest takes the mono capitals.
 */
export function StageLabel({ label, className }: { label: string; className?: string }) {
  const [mark, ...rest] = label.split(" · ");
  const isMark = mark !== undefined && /^\p{Script=Greek}+′?$/u.test(mark);
  return (
    <SectionLabel className={cn("text-primary", className)}>
      {isMark ? (
        <>
          <span lang="grc" className="font-greek text-[13px] normal-case">
            {mark}
          </span>
          {rest.length > 0 && ` · ${rest.join(" · ")}`}
        </>
      ) : (
        label
      )}
    </SectionLabel>
  );
}

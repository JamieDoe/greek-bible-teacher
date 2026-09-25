import { IconCheck } from "@/components/icons";

/**
 * The design's completion mark: a lapis check inside two quiet rings (112 px). It arrives in
 * sequence (rings, then the disc, then the check drawing itself) over about half a second, the
 * one place a longer animation earns its time.
 */
export function SuccessMark() {
  return (
    <span className="relative flex size-28 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 112 112" className="absolute inset-0 size-full text-accent">
        <circle
          cx="56"
          cy="56"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="origin-center animate-[pop-in_420ms_var(--ease-sheet)_80ms_both]"
        />
        <circle
          cx="56"
          cy="56"
          r="44"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="origin-center animate-[pop-in_380ms_var(--ease-sheet)_both]"
        />
      </svg>
      <span className="flex size-[68px] animate-[pop-in_300ms_var(--ease-sheet)_both] items-center justify-center rounded-full bg-primary text-primary-foreground">
        <IconCheck
          size={32}
          strokeWidth={2.2}
          className="draw-in [--draw-delay:200ms] [--draw-duration:300ms]"
        />
      </span>
    </span>
  );
}

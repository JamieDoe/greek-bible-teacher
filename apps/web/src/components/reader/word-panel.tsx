"use client";

import type { DisclosureLevel, ReaderToken } from "@gbt/shared";
import { useEffect, useRef } from "react";
import { SectionLabel } from "@/components/koine";
import { IconClose } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { WordDetail } from "./word-detail";

/**
 * The wide reader's word panel (design "11 · Reader — desktop"): a right rail that replaces the
 * sheet, so the text never moves or hides. Esc or ✕ clears the word and returns focus to it.
 */
export function WordPanel({
  token,
  verseRef,
  level,
  onLevelChange,
  onClose,
  known,
}: {
  token: ReaderToken | null;
  verseRef: string;
  level: DisclosureLevel;
  onLevelChange: (level: DisclosureLevel) => void;
  onClose: () => void;
  /** Words of the passage the learner already knows, for the footer; null until loaded. */
  known: { known: number; total: number } | null;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  // A newly selected word is announced by moving focus to it; Esc closes.
  useEffect(() => {
    if (!token) return;
    heading.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [token, onClose]);

  return (
    <aside
      aria-label="Word detail"
      className="fixed top-0 right-0 bottom-0 hidden w-[360px] flex-col border-l border-border bg-card px-8 pt-10 pb-9 md:flex xl:w-[440px] xl:px-9"
    >
      <SectionLabel>Word detail</SectionLabel>
      {/* Switching words crossfades the panel's content; the panel itself stays put. */}
      <div
        key={token?.id ?? "prompt"}
        className="mt-5 min-h-0 flex-1 animate-[fade-in_150ms_ease-out] overflow-y-auto"
      >
        {token ? (
          <WordDetail
            token={token}
            level={level}
            onLevelChange={onLevelChange}
            variant="panel"
            title={(word, className) => (
              <h2 ref={heading} tabIndex={-1} lang="grc" className={`${className} outline-none`}>
                {word}
                <span className="sr-only">, {verseRef}</span>
              </h2>
            )}
            closeButton={
              <Button variant="secondary" size="icon" aria-label="Close" onClick={onClose}>
                <IconClose size={20} />
              </Button>
            }
          />
        ) : (
          <p className="font-greek text-[22px] leading-[1.4] text-ink-2">
            Select any word to see its dictionary form, meaning and why it looks the way it does.
          </p>
        )}
      </div>
      {known && (
        <p className="mt-5 flex justify-between border-t border-border pt-5 text-[13px] text-muted-foreground">
          <span>
            You know {known.known} of {known.total} words here
          </span>
          <span className="font-mono text-xs">
            {Math.round((100 * known.known) / Math.max(1, known.total))}%
          </span>
        </p>
      )}
    </aside>
  );
}

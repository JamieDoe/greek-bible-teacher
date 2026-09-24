"use client";

import type { PassageResponse, ReaderToken } from "@gbt/shared";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "../use-session";
import { TokenSheet } from "./token-sheet";

type Passage = PassageResponse["passage"];

export function Reader({ passage }: { passage: Passage }) {
  const { level, changeLevel } = useSession();
  const [selected, setSelected] = useState<{ token: ReaderToken; ref: string } | null>(null);
  const buttons = useRef(new Map<number, HTMLButtonElement>());

  const returnFocusTo = useRef<number | null>(null);

  const close = useCallback(() => {
    returnFocusTo.current = selected?.token.id ?? null;
    setSelected(null);
  }, [selected]);

  // After the sheet has unmounted (and its modal dialog closed, so the page is no longer inert),
  // return focus to the word without scrolling, so the reader stays exactly in place.
  useEffect(() => {
    if (selected || returnFocusTo.current === null) return;
    buttons.current.get(returnFocusTo.current)?.focus({ preventScroll: true });
    returnFocusTo.current = null;
  }, [selected]);

  return (
    <>
      <article className="mx-auto w-full max-w-2xl px-5 pt-10 pb-16 sm:px-8">
        <header className="mb-8">
          <p className="text-sm tracking-wide text-muted uppercase">Reading</p>
          <h1 className="mt-1 font-serif text-3xl">{passage.title}</h1>
        </header>

        <div
          lang="grc"
          className="font-greek text-[1.375rem] leading-[2.1] sm:text-[1.5rem] sm:leading-[2.15]"
        >
          {passage.verses.map((verse) => (
            <span key={verse.id} id={`v-${verse.chapter}-${verse.number}`}>
              {verse.tokens.map((token, i) => (
                <Fragment key={token.id}>
                  {/* nowrap keeps punctuation (and the verse number) on the word's line */}
                  <span className="whitespace-nowrap">
                    {i === 0 && (
                      <>
                        <sup
                          aria-hidden="true"
                          className="mr-1 ml-0.5 align-super font-sans text-[0.55em] text-muted select-none"
                        >
                          {verse.number}
                        </sup>
                        <span lang="en" className="sr-only">
                          Verse {verse.number}
                        </span>
                      </>
                    )}
                    {token.before}
                    <button
                      type="button"
                      ref={(el) => {
                        if (el) buttons.current.set(token.id, el);
                        else buttons.current.delete(token.id);
                      }}
                      aria-haspopup="dialog"
                      aria-expanded={selected?.token.id === token.id}
                      onClick={() => setSelected({ token, ref: verse.displayRef })}
                      className="cursor-pointer rounded-[3px] px-[0.06em] leading-[1.25] transition-colors hover:bg-accent-soft aria-expanded:bg-accent-soft aria-expanded:text-accent"
                    >
                      {token.word}
                    </button>
                    {token.after}
                  </span>{" "}
                </Fragment>
              ))}
            </span>
          ))}
        </div>

        <footer className="mt-14 border-t border-rule pt-4 text-xs leading-relaxed text-muted">
          Greek text: SBL Greek New Testament (CC BY 4.0). Morphology and lemmas: MorphGNT (CC BY-SA
          3.0). Glosses: Dodson (public domain).{" "}
          <Link href="/about" className="underline underline-offset-2 hover:text-ink">
            Sources and licences
          </Link>
        </footer>
      </article>

      {selected && (
        <TokenSheet
          token={selected.token}
          verseRef={selected.ref}
          level={level}
          onLevelChange={changeLevel}
          onClose={close}
        />
      )}
    </>
  );
}

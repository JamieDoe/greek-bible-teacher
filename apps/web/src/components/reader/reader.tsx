"use client";

import {
  greekBookTitle,
  passageFamiliarityResponseSchema,
  type PassageResponse,
  type ReaderToken,
  readingCompleteResponseSchema,
  type ReadingCompleteResponse,
  senseLines,
} from "@gbt/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/app-shell";
import { IconBack, IconCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { useMediaQuery, WIDE_READER } from "@/components/use-media-query";
import { useGreekSize, useMarkNewWords, useSenseLines } from "@/components/use-preferences";
import { apiGet, apiPost, apiPostNoContent } from "@/lib/api-client";
import { GREEK_SIZES } from "@/lib/preferences";
import { ensureSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ListenToPassage } from "../speech";
import { useSession } from "../use-session";
import { type LookedUpWord, PassageComplete } from "./passage-complete";
import { WordPanel } from "./word-panel";
import { WordSheet } from "./word-sheet";

type Passage = PassageResponse["passage"];
type Verse = Passage["verses"][number];

export function Reader({
  passage,
  embedded = false,
  onFinished,
}: {
  passage: Passage;
  /** Inside a lesson: the lesson supplies the chrome, and finishing continues the lesson. */
  embedded?: boolean;
  onFinished?: (lookedUpLemmaIds: number[]) => void;
}) {
  const router = useRouter();
  const { level, changeLevel } = useSession();
  const wide = useMediaQuery(WIDE_READER);
  const [senseLinesOn] = useSenseLines();
  const [markNew] = useMarkNewWords();
  const [selected, setSelected] = useState<{ token: ReaderToken; ref: string } | null>(null);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const lastOpened = useRef<number | null>(null);
  // Words looked up during this read-through, in order, for the completion screen.
  const [lookedUp, setLookedUp] = useState<LookedUpWord[]>([]);
  const [tappedTokens, setTappedTokens] = useState<Set<number>>(new Set());
  const [known, setKnown] = useState<Set<number> | null>(null);
  const [finish, setFinish] = useState<
    | { status: "idle" }
    | { status: "saving" }
    | { status: "error" }
    | { status: "done"; result: ReadingCompleteResponse }
  >({ status: "idle" });
  const [scrolled, setScrolled] = useState<number | null>(null);

  // Which lemmas the learner already has in review ("known"); the rest are marked as new.
  useEffect(() => {
    let cancelled = false;
    ensureSession()
      .then(() => apiGet(`/passages/${passage.id}/familiarity`, passageFamiliarityResponseSchema))
      .then((f) => !cancelled && setKnown(new Set(f.knownLemmaIds)))
      .catch((err: unknown) => console.error("[reader] could not load familiarity", err));
    return () => {
      cancelled = true;
    };
  }, [passage.id]);

  // Keep this passage available offline (the service worker saves its page).
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage({
      type: "cache-page",
      path: `/read/${passage.id}`,
    });
  }, [passage.id]);

  // Reading progress: how far down the passage the reader has scrolled.
  useEffect(() => {
    if (embedded) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(max > 0 ? Math.min(100, (100 * window.scrollY) / max) : null);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [embedded]);

  function open(token: ReaderToken, ref: string) {
    // Tapping the selected word again deselects it (the design's reader).
    if (selected?.token.id === token.id) return close();
    lastOpened.current = token.id;
    setSelected({ token, ref });
    setTappedTokens((s) => new Set(s).add(token.id));
    setLookedUp((words) =>
      words.some((w) => w.lemmaId === token.lemma.id)
        ? words
        : [
            ...words,
            {
              lemmaId: token.lemma.id,
              word: token.word,
              lemma: token.lemma.lemma,
              gloss: token.lemma.gloss,
            },
          ],
    );
    // A lookup is a weak review signal; failing to record it must not disturb reading.
    ensureSession()
      .then(() => apiPostNoContent(`/reading/${passage.id}/lookup`, { tokenId: token.id }))
      .catch((err: unknown) => console.error("[reader] could not record lookup", err));
  }

  const returnFocus = useCallback(
    () => (lastOpened.current === null ? null : buttons.current.get(lastOpened.current)),
    [],
  );
  const close = useCallback(() => {
    setSelected(null);
    returnFocus()?.focus({ preventScroll: true });
  }, [returnFocus]);

  async function finishPassage() {
    setFinish({ status: "saving" });
    try {
      await ensureSession();
      const result = await apiPost(
        `/reading/${passage.id}/complete`,
        readingCompleteResponseSchema,
      );
      setSelected(null);
      setFinish({ status: "done", result });
      window.scrollTo({ top: 0 });
    } catch (err) {
      console.error("[reader] could not record completion", err);
      setFinish({ status: "error" });
    }
  }

  function readAgain() {
    setLookedUp([]);
    setTappedTokens(new Set());
    setFinish({ status: "idle" });
    window.scrollTo({ top: 0 });
  }

  const allTokens = passage.verses.flatMap((v) => v.tokens);
  const knownCount =
    known === null
      ? null
      : { known: allTokens.filter((t) => known.has(t.lemma.id)).length, total: allTokens.length };

  if (finish.status === "done") {
    const lastVerse = passage.verses.at(-1);
    const closingLine = (lastVerse?.tokens ?? [])
      .slice(0, 6)
      .map((t) => t.word)
      .join(" ");
    const knownAtStart = known ?? new Set<number>();
    return (
      <PassageComplete
        title={passage.title}
        closingLine={closingLine}
        result={finish.result}
        lookedUp={lookedUp}
        lookedUpTokens={tappedTokens.size}
        newWordsMet={lookedUp.filter((w) => !knownAtStart.has(w.lemmaId)).length}
        inLesson={!!onFinished}
        onReadAgain={readAgain}
        onDone={() => (onFinished ? onFinished(lookedUp.map((w) => w.lemmaId)) : router.push("/"))}
      />
    );
  }

  const firstVerse = passage.verses[0];
  const bookTitle = firstVerse ? greekBookTitle(firstVerse.ref) : null;
  const chapter = firstVerse?.chapter;
  const finishLabel = finish.status === "saving" ? "Saving…" : "Finish passage";

  const word = (token: ReaderToken, verse: Verse) => {
    const on = selected?.token.id === token.id;
    const isNew = markNew && known !== null && !known.has(token.lemma.id);
    return (
      <button
        type="button"
        ref={(el) => {
          if (el) buttons.current.set(token.id, el);
          else buttons.current.delete(token.id);
        }}
        aria-haspopup="dialog"
        aria-expanded={on}
        data-new={isNew || undefined}
        onClick={() => open(token, verse.displayRef)}
        className={cn(
          "relative cursor-pointer rounded-[5px] px-0.5 transition-[color,background-color,box-shadow] duration-[120ms] after:absolute after:-inset-x-0.5 after:-inset-y-2 after:content-['']",
          on
            ? "bg-accent text-primary shadow-[0_0_0_3px_var(--accent)]"
            : isNew &&
                "underline decoration-rubric decoration-dotted decoration-[1.5px] underline-offset-[6px]",
        )}
      >
        {token.word}
      </button>
    );
  };

  const verseNumber = (verse: Verse) => (
    <>
      <span aria-hidden="true">{verse.number}</span>
      <span lang="en" className="sr-only">
        Verse {verse.number}
      </span>
    </>
  );

  return (
    <div
      className={cn("animate-[fade-in_150ms_ease-out]", !embedded && "md:mr-[360px] xl:mr-[440px]")}
    >
      {!embedded && (
        <header className="sticky top-0 z-10 bg-background pt-[env(safe-area-inset-top)] md:border-b md:border-border">
          <div className="flex h-14 items-center justify-between pr-3 pl-2 md:h-[72px] md:px-8">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="icon" aria-label="Back to Today">
                <Link href="/">
                  <IconBack size={22} />
                </Link>
              </Button>
              <Wordmark className="hidden text-[22px] md:inline" />
            </div>
            <div className="min-w-0 text-center">
              <h1 className="truncate text-[15px] font-semibold">{passage.title}</h1>
              <p className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
                SBLGNT
                <span className="hidden md:inline"> · {allTokens.length} WORDS</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TextSizeControl />
              <Button
                size="sm"
                className="hidden h-10 rounded-[10px] px-4 text-sm font-semibold md:inline-flex"
                onClick={() => void finishPassage()}
                disabled={finish.status === "saving"}
              >
                {finishLabel}
              </Button>
            </div>
          </div>
          <div className="mx-5 h-0.5 rounded-sm bg-border md:hidden" aria-hidden="true">
            <div
              className="h-0.5 rounded-sm bg-primary transition-[width] duration-200"
              style={{ width: `${scrolled ?? 0}%` }}
            />
          </div>
        </header>
      )}

      <article
        className={cn(
          "mx-auto w-full pb-40 md:pb-24",
          embedded ? "max-w-2xl" : "pt-5 pr-6 pl-1.5 md:max-w-[640px] md:px-0 md:pt-[72px]",
        )}
      >
        {embedded ? (
          <h2 className="mb-6 font-heading text-3xl">{passage.title}</h2>
        ) : (
          bookTitle && (
            <p className="mb-[18px] text-center font-greek text-[13px] tracking-[0.22em] text-muted-foreground md:mb-7 md:text-sm md:tracking-[0.24em]">
              <span lang="grc">{bookTitle}</span>
              <span className="md:hidden"> · {chapter}</span>
              <span
                className="mt-1 hidden font-greek text-[56px] font-light tracking-normal text-foreground md:block"
                aria-hidden="true"
              >
                {chapter}
              </span>
            </p>
          )
        )}
        <div className={cn(!embedded && "pl-7 md:pl-10")}>
          <ListenToPassage
            verses={passage.verses.map((v) => ({
              ref: v.ref,
              text: v.tokens.map((t) => t.before + t.word + t.after).join(" "),
            }))}
          />
        </div>

        <div
          lang="grc"
          data-testid="passage-text"
          className="mt-5 font-greek text-greek leading-[1.62] md:text-[calc(var(--greek-size)*9/7)] md:leading-[1.7]"
        >
          {senseLinesOn ? (
            senseLines(passage.verses).map((line, i) => (
              <div
                key={i}
                id={line.first ? `v-${line.verse.chapter}-${line.verse.number}` : undefined}
                className="flex items-baseline gap-1.5"
              >
                <span className="w-[22px] shrink-0 pr-1.5 text-right font-mono text-[11px] font-medium text-primary md:w-[34px]">
                  {line.first && verseNumber(line.verse)}
                </span>
                {/* Real spaces between words (and after each line), so the text reads, copies
                    and searches as text; wrapped lines hang under the first. */}
                <span className="-indent-4 flex-1 pl-4 [word-spacing:0.08em]">
                  {line.tokens.map((token) => (
                    <Fragment key={token.id}>
                      <span className="whitespace-nowrap">
                        {token.before}
                        {word(token, line.verse)}
                        {token.after}
                      </span>{" "}
                    </Fragment>
                  ))}
                </span>
              </div>
            ))
          ) : (
            <p className="pl-7 md:pl-10">
              {passage.verses.map((verse) => (
                <span key={verse.id} id={`v-${verse.chapter}-${verse.number}`}>
                  {verse.tokens.map((token, i) => (
                    <Fragment key={token.id}>
                      {/* nowrap keeps punctuation (and the verse number) on the word's line */}
                      <span className="whitespace-nowrap">
                        {i === 0 && (
                          <sup className="mr-1 ml-0.5 font-mono text-[0.5em] font-medium text-primary select-none">
                            {verseNumber(verse)}
                          </sup>
                        )}
                        {token.before}
                        {word(token, verse)}
                        {token.after}
                      </span>{" "}
                    </Fragment>
                  ))}
                </span>
              ))}
            </p>
          )}
        </div>

        <p className="mt-14 border-t border-border pt-4 pl-7 text-xs leading-relaxed text-muted-foreground md:pl-0">
          Greek text: SBL Greek New Testament (CC BY 4.0). Morphology and lemmas: MorphGNT (CC BY-SA
          3.0). Glosses: Dodson (public domain).{" "}
          <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
            Sources and licences
          </Link>
        </p>
      </article>

      {/* The phone's action bar; wide screens have Finish in the header. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background pb-[max(20px,env(safe-area-inset-bottom))]",
          !embedded && "md:hidden",
        )}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 pt-3.5">
          <p className="text-[13px] leading-[1.35] text-muted-foreground">
            Tap any word.
            {markNew && known !== null && (
              <>
                <br />
                <span className="underline decoration-rubric decoration-dotted underline-offset-4">
                  Dotted
                </span>{" "}
                = new to you
              </>
            )}
          </p>
          <Button onClick={() => void finishPassage()} disabled={finish.status === "saving"}>
            {finishLabel} <IconCheck size={18} strokeWidth={2.2} />
          </Button>
        </div>
        {finish.status === "error" && (
          <p role="alert" className="px-5 pt-2 text-center text-sm text-rubric">
            Couldn’t save your progress. Please try again.
          </p>
        )}
      </div>

      {wide && !embedded ? (
        <WordPanel
          token={selected?.token ?? null}
          verseRef={selected?.ref ?? ""}
          level={level}
          onLevelChange={changeLevel}
          onClose={close}
          known={knownCount}
        />
      ) : (
        <WordSheet
          token={selected?.token ?? null}
          verseRef={selected?.ref ?? ""}
          level={level}
          onLevelChange={changeLevel}
          onClose={() => setSelected(null)}
          returnFocus={returnFocus}
        />
      )}
    </div>
  );
}

/** "Aa": Greek text size, remembered on this device. */
function TextSizeControl() {
  const [size, setSize] = useGreekSize();
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Text size"
          className="font-greek text-lg md:h-10 md:w-auto md:rounded-[10px] md:border md:border-border md:px-3.5 md:text-base"
        >
          Aa
        </Button>
      </DrawerTrigger>
      <DrawerContent aria-describedby={undefined}>
        <div className="px-6 pt-4 pb-9">
          <DrawerTitle className="text-[17px] font-semibold">Greek text size</DrawerTitle>
          <div className="mt-5 flex items-center gap-4">
            <span lang="grc" className="font-greek text-sm" aria-hidden="true">
              α
            </span>
            <Slider
              aria-label="Greek text size"
              min={GREEK_SIZES[0]}
              max={GREEK_SIZES.at(-1)}
              step={3}
              value={[size]}
              onValueChange={([v]) => v && setSize(v)}
            />
            <span lang="grc" className="font-greek text-2xl" aria-hidden="true">
              α
            </span>
          </div>
          <p lang="grc" className="mt-4 font-greek text-greek leading-normal">
            Ἐν ἀρχῇ ἦν ὁ λόγος
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

"use client";

import {
  passageFamiliarityResponseSchema,
  type PassageResponse,
  type ReaderToken,
  readingCompleteResponseSchema,
  type ReadingCompleteResponse,
} from "@gbt/shared";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useGreekSize } from "@/components/use-preferences";
import { apiGet, apiPost, apiPostNoContent } from "@/lib/api-client";
import { GREEK_SIZES } from "@/lib/preferences";
import { ensureSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ListenToPassage } from "../speech";
import { useSession } from "../use-session";
import { type LookedUpWord, PassageComplete } from "./passage-complete";
import { WordSheet } from "./word-sheet";

type Passage = PassageResponse["passage"];

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
  // Reading progress (0–100), or null when the whole passage fits on screen.
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

  async function finishPassage() {
    setFinish({ status: "saving" });
    try {
      await ensureSession();
      const result = await apiPost(
        `/reading/${passage.id}/complete`,
        readingCompleteResponseSchema,
      );
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

  const chapter = passage.verses[0]?.chapter;
  const book = passage.title.replace(/\s+\d.*$/, "");

  return (
    <>
      {!embedded && (
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-2 px-2 pt-2 sm:px-4">
            <Button asChild variant="ghost" size="icon" aria-label="Back to passages">
              <Link href="/read">
                <ChevronLeft aria-hidden="true" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1 text-center">
              <h1 className="truncate font-semibold">{passage.title}</h1>
              <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
                SBLGNT
              </p>
            </div>
            <TextSizeControl />
          </div>
          {scrolled === null ? (
            <div className="mt-2 h-0.5" />
          ) : (
            <Progress
              value={scrolled}
              aria-label="Reading progress"
              className="mx-auto mt-2 h-0.5 max-w-2xl"
            />
          )}
        </header>
      )}

      <article className="mx-auto w-full max-w-2xl px-5 pt-8 pb-32 sm:px-8">
        {embedded ? (
          <h2 className="mb-6 font-heading text-3xl">{passage.title}</h2>
        ) : (
          <p className="mb-6 text-center font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            {book} · {chapter}
          </p>
        )}
        <ListenToPassage
          verses={passage.verses.map((v) => ({
            ref: v.ref,
            text: v.tokens.map((t) => t.before + t.word + t.after).join(" "),
          }))}
        />

        <div lang="grc" className="mt-6 font-greek text-greek leading-[1.7]">
          {passage.verses.map((verse) => (
            <span key={verse.id} id={`v-${verse.chapter}-${verse.number}`}>
              {verse.tokens.map((token, i) => {
                const isNew = known !== null && !known.has(token.lemma.id);
                return (
                  <Fragment key={token.id}>
                    {/* nowrap keeps punctuation (and the verse number) on the word's line */}
                    <span className="whitespace-nowrap">
                      {i === 0 && (
                        <>
                          <sup
                            aria-hidden="true"
                            className="mr-1.5 ml-0.5 align-super font-sans text-[0.5em] font-medium text-primary select-none"
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
                        data-new={isNew || undefined}
                        onClick={() => open(token, verse.displayRef)}
                        className={cn(
                          "relative cursor-pointer rounded-md px-[0.08em] leading-[1.3] transition-colors after:absolute after:-inset-x-0.5 after:-inset-y-2 after:content-[''] hover:bg-accent aria-expanded:bg-accent aria-expanded:text-primary",
                          isNew &&
                            "underline decoration-rubric decoration-dotted decoration-2 underline-offset-[0.3em]",
                        )}
                      >
                        {token.word}
                      </button>
                      {token.after}
                    </span>{" "}
                  </Fragment>
                );
              })}
            </span>
          ))}
        </div>

        <p className="mt-14 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          Greek text: SBL Greek New Testament (CC BY 4.0). Morphology and lemmas: MorphGNT (CC BY-SA
          3.0). Glosses: Dodson (public domain).{" "}
          <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
            Sources and licences
          </Link>
        </p>
      </article>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <p className="text-sm text-muted-foreground">
            Tap any word.
            {known !== null && (
              <>
                {" "}
                <span className="underline decoration-rubric decoration-dotted decoration-2 underline-offset-4">
                  Dotted
                </span>{" "}
                = new to you
              </>
            )}
          </p>
          <Button onClick={() => void finishPassage()} disabled={finish.status === "saving"}>
            {finish.status === "saving" ? "Saving…" : "Finish passage"}
          </Button>
        </div>
        {finish.status === "error" && (
          <p role="alert" className="px-5 pb-2 text-center text-sm text-rubric">
            Couldn’t save your progress. Please try again.
          </p>
        )}
      </div>

      <WordSheet
        token={selected?.token ?? null}
        verseRef={selected?.ref ?? ""}
        level={level}
        onLevelChange={changeLevel}
        onClose={() => setSelected(null)}
        returnFocus={returnFocus}
      />
    </>
  );
}

/** "Aa": Greek text size, remembered on this device. */
function TextSizeControl() {
  const [size, setSize] = useGreekSize();
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Text size" className="font-heading text-xl">
          Aa
        </Button>
      </DrawerTrigger>
      <DrawerContent aria-describedby={undefined}>
        <div className="px-6 pt-4 pb-8">
          <DrawerTitle className="text-lg font-semibold">Greek text size</DrawerTitle>
          <div className="mt-5 flex items-center gap-4">
            <span lang="grc" className="font-greek text-base" aria-hidden="true">
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
            <span lang="grc" className="font-greek text-3xl" aria-hidden="true">
              α
            </span>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

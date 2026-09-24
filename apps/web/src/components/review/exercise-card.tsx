"use client";

import { partOfSpeechLabel, type ReviewGrade, type ReviewItem } from "@gbt/shared";
import { useEffect, useRef, useState } from "react";

type Phase = "intro" | "question" | "answered";

/**
 * One review card. New words are introduced first (word + gloss), then asked; every card is
 * recognition: pick the English meaning of the Greek, alone or in its verse.
 */
export function ExerciseCard({
  item,
  retry,
  saving,
  onGrade,
}: {
  item: ReviewItem;
  retry: boolean;
  saving: boolean;
  onGrade: (grade: ReviewGrade, correct: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>(item.kind === "new" && !retry ? "intro" : "question");
  const [chosen, setChosen] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const { exercise, lemma } = item;
  const correct = chosen === exercise.answerIndex;

  useEffect(() => heading.current?.focus(), [phase]);

  if (phase === "intro") {
    return (
      <section aria-labelledby="card-heading">
        <p className="text-xs tracking-wide text-accent uppercase">New word</p>
        <h1
          id="card-heading"
          ref={heading}
          tabIndex={-1}
          lang="grc"
          className="mt-2 font-greek text-5xl outline-none"
        >
          {lemma.lemma}
        </h1>
        <p className="mt-4 font-serif text-2xl">{lemma.gloss}</p>
        <p className="mt-2 text-sm text-muted">
          {lemma.partOfSpeech ? `${partOfSpeechLabel(lemma.partOfSpeech)} · ` : ""}
          {lemma.ntFrequency.toLocaleString("en")} times in the NT
        </p>
        <button
          type="button"
          onClick={() => setPhase("question")}
          className="mt-8 rounded-full bg-ink px-6 py-2.5 text-sm text-paper hover:opacity-90"
        >
          Got it, test me
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="card-heading">
      {exercise.type === "context" && exercise.context ? (
        <>
          <p className="text-xs text-muted">{exercise.context.displayRef}</p>
          <p lang="grc" className="mt-2 font-greek text-2xl leading-[1.9]">
            {exercise.context.tokens.map((t, i) => (
              <span key={i}>
                {t.before}
                {t.isTarget ? (
                  <mark className="rounded-[3px] bg-accent-soft px-0.5 text-accent underline decoration-2 underline-offset-4">
                    {t.word}
                  </mark>
                ) : (
                  t.word
                )}
                {t.after}{" "}
              </span>
            ))}
          </p>
          <h1 id="card-heading" ref={heading} tabIndex={-1} className="mt-6 text-lg outline-none">
            What does the highlighted word mean?
          </h1>
        </>
      ) : (
        <>
          <p lang="grc" className="font-greek text-5xl">
            {lemma.lemma}
          </p>
          <h1 id="card-heading" ref={heading} tabIndex={-1} className="mt-4 text-lg outline-none">
            What does it mean?
          </h1>
        </>
      )}
      {retry && <p className="mt-1 text-sm text-muted">You missed this earlier. Try again.</p>}

      <ul className="mt-5 grid gap-2">
        {exercise.options.map((option, i) => {
          const isAnswer = i === exercise.answerIndex;
          const state =
            phase !== "answered" ? "idle" : isAnswer ? "answer" : i === chosen ? "wrong" : "idle";
          return (
            <li key={i}>
              <button
                type="button"
                disabled={phase === "answered"}
                onClick={() => {
                  setChosen(i);
                  setPhase("answered");
                }}
                aria-describedby={state === "answer" ? "feedback" : undefined}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  state === "answer"
                    ? "border-accent bg-accent-soft"
                    : state === "wrong"
                      ? "border-rule text-muted line-through"
                      : "border-rule hover:bg-accent-soft disabled:hover:bg-transparent"
                }`}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>

      {phase === "answered" && (
        <div className="mt-5" id="feedback">
          <p role="status" className="text-sm">
            {correct ? (
              "Correct. How easy was it?"
            ) : (
              <>
                Not quite:{" "}
                <span lang="grc" className="font-greek">
                  {lemma.lemma}
                </span>{" "}
                means “{lemma.gloss}”. It will come back shortly.
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {correct ? (
              (["hard", "good", "easy"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  disabled={saving}
                  onClick={() => onGrade(g, true)}
                  className={`rounded-full px-5 py-2 capitalize disabled:opacity-60 ${
                    g === "good"
                      ? "bg-ink text-paper hover:opacity-90"
                      : "border border-rule hover:bg-accent-soft"
                  }`}
                >
                  {g}
                </button>
              ))
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => onGrade("again", false)}
                className="rounded-full bg-ink px-5 py-2 text-paper hover:opacity-90 disabled:opacity-60"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

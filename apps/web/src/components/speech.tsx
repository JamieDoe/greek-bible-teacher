"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { findGreekVoice, speakableText } from "@/lib/speech";

// The Greek voice's name is the store snapshot: a stable string, where voice objects may be
// recreated by the browser on every getVoices() call.
function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}
const voiceName = () =>
  typeof window !== "undefined" && "speechSynthesis" in window
    ? (findGreekVoice(window.speechSynthesis.getVoices())?.name ?? null)
    : null;

/** The device's Greek voice (Modern Greek), or unavailable when there is none. */
export function useGreekVoice() {
  const name = useSyncExternalStore(subscribe, voiceName, () => null);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!name) return;
      const synth = window.speechSynthesis;
      const voice = synth.getVoices().find((v) => v.name === name);
      synth.cancel(); // one utterance at a time
      const utterance = new SpeechSynthesisUtterance(speakableText(text));
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = "el-GR";
      }
      utterance.rate = 0.8; // a little slower for learners
      if (onEnd) {
        utterance.onend = onEnd;
        utterance.onerror = onEnd;
      }
      synth.speak(utterance);
    },
    [name],
  );
  const stop = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  return { available: name !== null, speak, stop };
}

function SpeakerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

/**
 * A 44×44 speaker button that says `text` with the device's Greek voice. Renders nothing when
 * the device has no Greek voice. Audio is Modern Greek, so the label says so.
 */
export function SpeakButton({ text, label }: { text: string; label: string }) {
  const { available, speak, stop } = useGreekVoice();
  useEffect(() => stop, [stop]);
  if (!available) return null;
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label={`${label} (Modern Greek voice)`}
      title="Hear it (Modern Greek voice)"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-foreground hover:opacity-80"
    >
      <SpeakerIcon />
    </button>
  );
}

/** Plays or stops the whole passage, with a visible note that the voice is Modern Greek. */
export function ListenToPassage({ text }: { text: string }) {
  const { available, speak, stop } = useGreekVoice();
  const [playing, setPlaying] = useState(false);
  useEffect(() => stop, [stop]);
  if (!available) return null;
  return (
    <div className="mt-3 flex items-center gap-3 text-sm">
      <button
        type="button"
        aria-pressed={playing}
        onClick={() => {
          if (playing) {
            stop();
            setPlaying(false);
          } else {
            setPlaying(true);
            speak(text, () => setPlaying(false));
          }
        }}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 hover:opacity-80"
      >
        <SpeakerIcon />
        {playing ? "Stop" : "Listen"}
      </button>
      <span className="text-muted-foreground">
        Modern Greek voice ·{" "}
        <Link
          href="/grammar/alphabet"
          className="underline underline-offset-2 hover:text-foreground"
        >
          why it differs
        </Link>
      </span>
    </div>
  );
}

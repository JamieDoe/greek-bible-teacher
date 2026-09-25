"use client";

import { type AudioManifest, speakableText } from "@gbt/shared";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { loadAudioManifest, playClip, stopClip, verseClipUrl, wordClipUrl } from "@/lib/audio";
import { IconSpeaker } from "@/components/icons";
import { findGreekVoice } from "@/lib/speech";

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

/** The recordings manifest once loaded; null until then or when there is none. */
function useAudioManifest(): AudioManifest | null {
  const [manifest, setManifest] = useState<AudioManifest | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadAudioManifest().then((m) => !cancelled && setManifest(m));
    return () => {
      cancelled = true;
    };
  }, []);
  return manifest;
}

/**
 * A 44×44 speaker button that says `text`: the recorded voice when there is a recording,
 * otherwise the device's Greek voice. Renders nothing when neither exists. Both are Modern
 * Greek, so the label says so.
 */
export function SpeakButton({ text, label }: { text: string; label: string }) {
  const manifest = useAudioManifest();
  const device = useGreekVoice();
  const { stop } = device;
  useEffect(
    () => () => {
      stopClip();
      stop();
    },
    [stop],
  );
  const url = wordClipUrl(manifest, text);
  if (!url && !device.available) return null;

  function say() {
    device.stop();
    if (!url) return device.speak(text);
    playClip(url).catch((err: unknown) => {
      console.error("[audio] recording failed; using the device voice", err);
      if (device.available) device.speak(text);
    });
  }

  return (
    <button
      type="button"
      onClick={say}
      aria-label={`${label} (Modern Greek voice)`}
      title="Hear it (Modern Greek voice)"
      className="pressable inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-muted text-foreground hover:bg-border"
    >
      <IconSpeaker size={20} />
    </button>
  );
}

/**
 * Plays or stops the whole passage, verse by verse (a recording where there is one, otherwise
 * the device voice), with a visible note that the voice is Modern Greek.
 */
export function ListenToPassage({ verses }: { verses: readonly { ref: string; text: string }[] }) {
  const manifest = useAudioManifest();
  const device = useGreekVoice();
  const { stop: stopDevice } = device;
  const [playing, setPlaying] = useState(false);
  // Each play gets an id; stopping (or a newer play) makes older loops end quietly.
  const run = useRef(0);
  const stop = useCallback(() => {
    run.current++;
    stopClip();
    stopDevice();
    setPlaying(false);
  }, [stopDevice]);
  useEffect(() => stop, [stop]);

  const recorded = verses.some((v) => verseClipUrl(manifest, v.ref));
  if (!recorded && !device.available) return null;

  async function play() {
    const id = ++run.current;
    setPlaying(true);
    for (const verse of verses) {
      if (run.current !== id) return;
      const url = verseClipUrl(manifest, verse.ref);
      try {
        if (url) await playClip(url);
        else if (device.available)
          await new Promise<void>((done) => device.speak(verse.text, done));
      } catch (err) {
        console.error(`[audio] could not play ${verse.ref}`, err);
      }
    }
    if (run.current === id) setPlaying(false);
  }

  return (
    <div className="flex items-center gap-3 text-[13px]">
      <button
        type="button"
        aria-pressed={playing}
        onClick={() => (playing ? stop() : void play())}
        className="pressable inline-flex h-9 items-center gap-2 rounded-md bg-muted px-3 font-medium hover:bg-border"
      >
        <IconSpeaker size={18} />
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

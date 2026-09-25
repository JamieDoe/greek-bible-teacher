// Pre-generated pronunciation audio (ElevenLabs, DECISIONS 028): the manifest says which words
// and verses have a recording; anything else falls back to the device's voice.
import {
  AUDIO_BASE_PATH,
  type AudioManifest,
  audioManifestSchema,
  spokenWordKey,
} from "@gbt/shared";

let manifest: Promise<AudioManifest | null> | null = null;

/** The audio manifest, fetched once per page load; null when there is none or it can't load. */
export function loadAudioManifest(): Promise<AudioManifest | null> {
  manifest ??= fetch(`${AUDIO_BASE_PATH}/manifest.json`)
    .then(async (res) => (res.ok ? audioManifestSchema.parse(await res.json()) : null))
    .catch((err: unknown) => {
      console.error("[audio] could not load the audio manifest", err);
      return null;
    });
  return manifest;
}

export function wordClipUrl(m: AudioManifest | null, word: string): string | null {
  const file = m?.words[spokenWordKey(word)];
  return file ? `${AUDIO_BASE_PATH}/${file}` : null;
}

export function verseClipUrl(m: AudioManifest | null, ref: string): string | null {
  const file = m?.verses[ref];
  return file ? `${AUDIO_BASE_PATH}/${file}` : null;
}

// One sound at a time, across every speaker button on the page.
let current: { audio: HTMLAudioElement; objectUrl: string; done: () => void } | null = null;

export function stopClip(): void {
  if (!current) return;
  const { audio, objectUrl, done } = current;
  current = null;
  audio.pause();
  URL.revokeObjectURL(objectUrl);
  done();
}

/**
 * Plays a recording and resolves when it ends (or is stopped). The file is fetched whole and
 * played from memory rather than streamed, so the service worker can serve it offline (media
 * elements otherwise make range requests a cached file can't answer).
 */
export async function playClip(url: string): Promise<void> {
  stopClip();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`audio ${url}: HTTP ${res.status}`);
  const objectUrl = URL.createObjectURL(await res.blob());
  const audio = new Audio(objectUrl);
  return new Promise<void>((resolve, reject) => {
    const done = () => resolve();
    current = { audio, objectUrl, done };
    const finish = () => {
      if (current?.audio === audio) stopClip();
    };
    audio.addEventListener("ended", finish);
    audio.addEventListener("error", () => {
      finish();
      reject(new Error(`audio ${url} could not play`));
    });
    audio.play().catch((err: unknown) => {
      finish();
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

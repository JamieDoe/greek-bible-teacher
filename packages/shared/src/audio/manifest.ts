import { z } from "zod";
import { speakableText } from "../reading/speakable";

/** Where the pre-generated pronunciation audio is served from (apps/web/public/audio). */
export const AUDIO_BASE_PATH = "/audio";

/**
 * `/audio/manifest.json`: which recordings exist (DECISIONS 028). Words are keyed by
 * `spokenWordKey`, so a form shared by several passages or lemmas is recorded once; verses by
 * reference ("JHN 1:1"). Values are file names under AUDIO_BASE_PATH.
 * Anything missing falls back to the device's voice.
 */
export const audioManifestSchema = z.object({
  provider: z.literal("ElevenLabs"),
  voice: z.object({ name: z.string(), id: z.string() }),
  model: z.string(),
  outputFormat: z.string(),
  generatedAt: z.iso.datetime(),
  words: z.record(z.string(), z.string()),
  verses: z.record(z.string(), z.string()),
});
export type AudioManifest = z.infer<typeof audioManifestSchema>;

/** A word's manifest key: its spoken spelling in lower case (capitals don't change the sound). */
export const spokenWordKey = (word: string): string => speakableText(word).toLocaleLowerCase("el");

// ElevenLabs text-to-speech, used only by the audio generator (never at run time). API as
// documented at elevenlabs.io/docs/api-reference (checked 2026-09-25).

/** The voice chosen by listening comparison (DECISIONS 028). */
export const AUDIO_VOICE = {
  voiceName: "Kyriakos",
  model: "eleven_v3",
  outputFormat: "mp3_44100_128",
  languageCode: "el",
  seed: 7,
} as const;

/** Published API price for eleven_v3, US$ per 1,000 characters (pricing page, 2026-09-25). */
export const PRICE_PER_1000_CHARS = 0.1;

const API = "https://api.elevenlabs.io";

export class ElevenLabsError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`ElevenLabs HTTP ${status}: ${detail.slice(0, 300)}`);
    this.name = "ElevenLabsError";
  }
}

export async function findVoiceId(apiKey: string, name: string): Promise<string> {
  const url = new URL(`${API}/v2/voices`);
  url.searchParams.set("search", name);
  url.searchParams.set("page_size", "100");
  const res = await fetch(url, { headers: { "xi-api-key": apiKey } });
  if (!res.ok) throw new ElevenLabsError(res.status, await res.text());
  const { voices } = (await res.json()) as { voices: { voice_id: string; name: string }[] };
  const voice = voices.find((v) => v.name === name || v.name.startsWith(`${name} `));
  if (!voice) throw new Error(`Voice "${name}" is not in this ElevenLabs account (add it first)`);
  return voice.voice_id;
}

export async function synthesize(apiKey: string, voiceId: string, text: string): Promise<Buffer> {
  const url = new URL(`${API}/v1/text-to-speech/${voiceId}`);
  url.searchParams.set("output_format", AUDIO_VOICE.outputFormat);
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: AUDIO_VOICE.model,
      language_code: AUDIO_VOICE.languageCode,
      seed: AUDIO_VOICE.seed,
    }),
  });
  if (!res.ok) throw new ElevenLabsError(res.status, await res.text());
  return Buffer.from(await res.arrayBuffer());
}

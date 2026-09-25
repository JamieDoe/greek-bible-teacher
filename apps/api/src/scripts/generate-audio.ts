// Generates the pronunciation audio for the curated lessons with ElevenLabs (DECISIONS 028).
//   pnpm audio:generate                # dry run: what would be generated, and the cost
//   pnpm audio:generate -- --yes       # generate what is missing
//   options: --max-chars=N (default 10000) · --prune (delete files no longer in the manifest)
// Needs DATABASE_URL (seeded) and ELEVENLABS_API_KEY. Existing clips are never regenerated.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { type AudioManifest } from "@gbt/shared";
import { sql } from "drizzle-orm";
import {
  AUDIO_VOICE,
  ElevenLabsError,
  findVoiceId,
  PRICE_PER_1000_CHARS,
  synthesize,
} from "../audio/elevenlabs";
import { type Clip, CLIP_FILE, clipFileName, type PlanToken, planClips } from "../audio/plan";
import { createDb } from "../db/client";

const OUT_DIR = fileURLToPath(new URL("../../../web/public/audio/", import.meta.url));
const MANIFEST = `${OUT_DIR}manifest.json`;
/** A single word longer than this is worth a listen (silence or extra sounds). */
const LONG_WORD_SECONDS = 2;
const BYTES_PER_SECOND = 128_000 / 8; // mp3_44100_128
/** Requests in flight at once; ElevenLabs limits concurrency per plan (3 on smaller plans). */
const CONCURRENCY = 3;

const args = process.argv.slice(2);
const spend = args.includes("--yes");
const prune = args.includes("--prune");
const maxChars = Number(args.find((a) => a.startsWith("--max-chars="))?.split("=")[1] ?? 10_000);

const databaseUrl = process.env.DATABASE_URL;
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!databaseUrl) fail("DATABASE_URL is not set");
if (!apiKey) fail("ELEVENLABS_API_KEY is not set (see .env.example)");

function fail(message: string): never {
  console.error(`[audio] ${message}`);
  process.exit(1);
}

async function curatedTokens(): Promise<PlanToken[]> {
  const { db, client } = createDb(databaseUrl!, { max: 1 });
  try {
    const rows = await db.execute<PlanToken & Record<string, unknown>>(sql`
      select distinct v.ref as "verseRef", t.position, t.surface, t.word, l.lemma
      from passages ps
      join verses sv on sv.id = ps.start_verse_id
      join verses ev on ev.id = ps.end_verse_id
      join verses v on v.ordinal between sv.ordinal and ev.ordinal
      join tokens t on t.verse_id = v.id
      join lemmas l on l.id = t.lemma_id`);
    return [...rows];
  } finally {
    await client.end();
  }
}

const tokens = await curatedTokens();
if (tokens.length === 0) fail("no curated passages in the database (run pnpm release first)");

const voiceId = await findVoiceId(apiKey!, AUDIO_VOICE.voiceName);
const settings = { ...AUDIO_VOICE, voiceId };
const clips = planClips(tokens).map((clip) => ({
  ...clip,
  file: clipFileName(settings, clip.text),
}));
mkdirSync(OUT_DIR, { recursive: true });
const missing = clips.filter((c) => !existsSync(OUT_DIR + c.file));
const chars = missing.reduce((n, c) => n + c.text.length, 0);

console.log(
  `[audio] ${clips.length} clips for the curated passages ` +
    `(${clips.filter((c) => c.kind === "word").length} words, ` +
    `${clips.filter((c) => c.kind === "verse").length} verses); ${clips.length - missing.length} already exist.`,
);
console.log(
  `[audio] to generate: ${missing.length} clips, ${chars} characters, ` +
    `about $${((chars / 1000) * PRICE_PER_1000_CHARS).toFixed(2)} at ${AUDIO_VOICE.model} list price.`,
);

let generated = 0;
if (missing.length > 0 && !spend) {
  console.log("[audio] dry run: nothing generated. Re-run with --yes to generate.");
} else if (chars > maxChars) {
  fail(`${chars} characters is over the --max-chars budget of ${maxChars}; nothing generated`);
} else {
  generated = await generate(missing);
}

writeManifest();
report();

async function generate(todo: (Clip & { file: string })[]): Promise<number> {
  const queue = [...todo];
  let done = 0;
  let stopped = false;
  async function worker() {
    for (let clip = queue.shift(); clip && !stopped; clip = queue.shift()) {
      try {
        const audio = await withRetry(() => synthesize(apiKey!, voiceId, clip!.text));
        // Write, then rename: an interrupted run never leaves a half file under a real name.
        writeFileSync(`${OUT_DIR}${clip.file}.partial`, audio);
        renameSync(`${OUT_DIR}${clip.file}.partial`, OUT_DIR + clip.file);
        done++;
        if (done % 25 === 0) console.log(`[audio] ${done}/${todo.length}`);
      } catch (err) {
        if (err instanceof ElevenLabsError && [401, 402, 403].includes(err.status)) {
          if (!stopped) console.error(`[audio] stopping: ${err.message}`);
          stopped = true;
          return;
        }
        console.error(`[audio] skipped "${clip.key}": ${(err as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`[audio] generated ${done} of ${todo.length}`);
  return done;
}

/** Retries rate limits and server errors a few times, backing off. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = err instanceof ElevenLabsError && (err.status === 429 || err.status >= 500);
      if (!retryable || attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, 2_000 * attempt));
    }
  }
}

function writeManifest() {
  const present = clips.filter((c) => existsSync(OUT_DIR + c.file));
  const manifest: AudioManifest = {
    provider: "ElevenLabs",
    voice: { name: AUDIO_VOICE.voiceName, id: voiceId },
    model: AUDIO_VOICE.model,
    outputFormat: AUDIO_VOICE.outputFormat,
    generatedAt: new Date().toISOString(),
    words: Object.fromEntries(present.filter((c) => c.kind === "word").map((c) => [c.key, c.file])),
    verses: Object.fromEntries(
      present.filter((c) => c.kind === "verse").map((c) => [c.key, c.file]),
    ),
  };
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 1)}\n`);
  console.log(
    `[audio] manifest: ${Object.keys(manifest.words).length} words, ${Object.keys(manifest.verses).length} verses`,
  );

  const referenced = new Set(present.map((c) => c.file));
  const stale = readdirSync(OUT_DIR).filter((f) => CLIP_FILE.test(f) && !referenced.has(f));
  if (stale.length > 0 && prune) {
    for (const f of stale) rmSync(OUT_DIR + f);
    console.log(`[audio] pruned ${stale.length} files no longer in the manifest`);
  } else if (stale.length > 0) {
    console.log(
      `[audio] ${stale.length} files are no longer in the manifest (--prune removes them)`,
    );
  }
}

function report() {
  const long = clips
    .filter((c) => c.kind === "word" && existsSync(OUT_DIR + c.file))
    .map((c) => ({ key: c.key, seconds: statSync(OUT_DIR + c.file).size / BYTES_PER_SECOND }))
    .filter((c) => c.seconds > LONG_WORD_SECONDS);
  if (long.length > 0) {
    console.log(
      `[audio] ${long.length} word clips are over ${LONG_WORD_SECONDS}s; worth a listen:`,
    );
    for (const c of long) console.log(`  ${c.key} (${c.seconds.toFixed(1)}s)`);
  }
  if (spend) console.log(`[audio] done: ${generated} new clips`);
}

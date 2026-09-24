import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { IngestError } from "./errors";

/** Repo-level `data/` directory holding pinned raw files and licence texts. */
export const dataDir = new URL("../../../../data/", import.meta.url);

const lockSchema = z.object({
  sources: z.record(z.string(), z.object({ repo: z.url(), commit: z.string() })),
  files: z.array(z.object({ path: z.string(), url: z.url(), sha256: z.string().length(64) })),
});
export type DataLock = z.infer<typeof lockSchema>;

export async function readLock(): Promise<DataLock> {
  const raw = await readFile(new URL("sources.lock.json", dataDir), "utf8");
  return lockSchema.parse(JSON.parse(raw));
}

export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Reads a pinned data file, failing if it is missing or its checksum differs from the lock. */
export async function readPinnedFile(lock: DataLock, path: string): Promise<string> {
  const entry = lock.files.find((f) => f.path === path);
  if (!entry) throw new IngestError(`data/${path} is not listed in data/sources.lock.json`);
  let bytes: Buffer;
  try {
    bytes = await readFile(new URL(path, dataDir));
  } catch (err) {
    throw new IngestError(`data/${path} is missing; run \`pnpm data:fetch\``, { cause: err });
  }
  const actual = sha256(bytes);
  if (actual !== entry.sha256) {
    throw new IngestError(
      `data/${path} checksum mismatch (expected ${entry.sha256}, got ${actual})`,
    );
  }
  return bytes.toString("utf8");
}

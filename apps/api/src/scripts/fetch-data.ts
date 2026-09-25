import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dataDir, readLock, sha256 } from "../ingest/data-files";

// Downloads every file pinned in data/sources.lock.json that is missing or differs, and
// verifies its checksum. The raw files are committed, so this is for re-creating data/.
const lock = await readLock();
let failed = false;
for (const file of lock.files) {
  const target = new URL(file.path, dataDir);
  const existing = await readFile(target).catch(() => null);
  if (existing && sha256(existing) === file.sha256) continue;

  const res = await fetch(file.url);
  if (!res.ok) {
    console.error(`[data] ${file.path}: HTTP ${res.status} from ${file.url}`);
    failed = true;
    continue;
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const actual = sha256(bytes);
  if (actual !== file.sha256) {
    console.error(`[data] ${file.path}: checksum ${actual} does not match the lock`);
    failed = true;
    continue;
  }
  await mkdir(new URL(".", target), { recursive: true });
  await writeFile(target, bytes);
  console.log(`[data] fetched ${file.path}`);
}
if (failed) process.exit(1);
console.log(`[data] ${lock.files.length} files present and verified`);

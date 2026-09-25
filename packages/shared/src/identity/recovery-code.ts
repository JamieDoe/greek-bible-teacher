/**
 * Recovery codes let a learner carry their anonymous progress to another browser or device
 * (DECISIONS 027). A code is 80 random bits written as 16 Crockford base-32 characters in four
 * groups ("K7QM-3XJ9-PT2W-HV8C"): no I, L, O or U, so it reads aloud and copies by hand
 * without ambiguity, and common slips (O for 0, I or L for 1, lower case, missing hyphens) are
 * forgiven on entry.
 */
export const RECOVERY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const RECOVERY_CODE_LENGTH = 16;
/** Random bytes needed for one code: 16 characters × 5 bits = 80 bits. */
export const RECOVERY_CODE_BYTES = 10;

/** Encodes exactly 10 random bytes as a canonical 16-character code (no hyphens). */
export function recoveryCodeFromBytes(bytes: Uint8Array): string {
  if (bytes.length !== RECOVERY_CODE_BYTES) {
    throw new Error(`A recovery code needs ${RECOVERY_CODE_BYTES} random bytes`);
  }
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += RECOVERY_ALPHABET[(value >>> bits) & 31];
    }
    value &= (1 << bits) - 1;
  }
  return out;
}

/** "K7QM3XJ9PT2WHV8C" → "K7QM-3XJ9-PT2W-HV8C", for display. */
export function formatRecoveryCode(canonical: string): string {
  return canonical.match(/.{1,4}/g)?.join("-") ?? canonical;
}

/**
 * Reads a code as typed: case, spaces, hyphens and dashes are ignored, and O, I and L are read as 0, 1
 * and 1. Returns the canonical 16 characters, or null if it can't be a code.
 */
export function normalizeRecoveryCode(input: string): string | null {
  const code = input
    .toUpperCase()
    .replace(/[\s\-\u2010-\u2015]/g, "") // spaces, hyphens and dashes pasted from documents
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (code.length !== RECOVERY_CODE_LENGTH) return null;
  return [...code].every((ch) => RECOVERY_ALPHABET.includes(ch)) ? code : null;
}

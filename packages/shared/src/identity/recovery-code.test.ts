import { describe, expect, it } from "vitest";
import {
  formatRecoveryCode,
  normalizeRecoveryCode,
  RECOVERY_ALPHABET,
  recoveryCodeFromBytes,
} from "./recovery-code";

describe("recoveryCodeFromBytes", () => {
  it("encodes 80 bits as 16 Crockford base-32 characters, most significant first", () => {
    expect(recoveryCodeFromBytes(new Uint8Array(10))).toBe("0000000000000000");
    expect(recoveryCodeFromBytes(new Uint8Array(10).fill(255))).toBe("ZZZZZZZZZZZZZZZZ");
    // 0x08 = 00001|000…: the first 5 bits are 1, then zeros.
    expect(recoveryCodeFromBytes(Uint8Array.of(0x08, 0, 0, 0, 0, 0, 0, 0, 0, 0))).toBe(
      "1000000000000000",
    );
    // The last 5 bits land in the last character.
    expect(recoveryCodeFromBytes(Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 31))).toBe(
      "000000000000000Z",
    );
  });

  it("only uses the unambiguous alphabet", () => {
    const code = recoveryCodeFromBytes(Uint8Array.from({ length: 10 }, (_, i) => i * 37 + 11));
    expect(code).toHaveLength(16);
    expect([...code].every((ch) => RECOVERY_ALPHABET.includes(ch))).toBe(true);
    expect(RECOVERY_ALPHABET).not.toMatch(/[ILOU]/);
  });

  it("refuses the wrong number of bytes", () => {
    expect(() => recoveryCodeFromBytes(new Uint8Array(9))).toThrow(/10 random bytes/);
  });
});

describe("formatRecoveryCode", () => {
  it("groups the code in fours", () => {
    expect(formatRecoveryCode("K7QM3XJ9PT2WHV8C")).toBe("K7QM-3XJ9-PT2W-HV8C");
  });
});

describe("normalizeRecoveryCode", () => {
  it("accepts the code however it was written down", () => {
    for (const typed of [
      "K7QM-3XJ9-PT2W-HV8C",
      "k7qm3xj9pt2whv8c",
      " K7QM 3XJ9 PT2W HV8C ",
      "K7QM–3XJ9—PT2W-HV8C", // en and em dashes from a word processor
    ]) {
      expect(normalizeRecoveryCode(typed)).toBe("K7QM3XJ9PT2WHV8C");
    }
  });

  it("reads O as 0 and I or L as 1", () => {
    expect(normalizeRecoveryCode("OOOO-IIII-LLLL-oill")).toBe("0000111111110111");
  });

  it("rejects anything that can't be a code", () => {
    expect(normalizeRecoveryCode("")).toBeNull();
    expect(normalizeRecoveryCode("K7QM-3XJ9-PT2W-HV8")).toBeNull(); // too short
    expect(normalizeRecoveryCode("K7QM-3XJ9-PT2W-HV8CC")).toBeNull(); // too long
    expect(normalizeRecoveryCode("U7QM-3XJ9-PT2W-HV8C")).toBeNull(); // U isn't used
    expect(normalizeRecoveryCode("K7QM-3XJ9-PT2W-HV8!")).toBeNull();
  });
});

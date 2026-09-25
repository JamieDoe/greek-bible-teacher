import { describe, expect, it } from "vitest";
import { findGreekVoice } from "./speech";

describe("findGreekVoice", () => {
  const v = (name: string, lang: string, extra: object = {}) => ({ name, lang, ...extra });

  it("returns null when the device has no Greek voice", () => {
    expect(findGreekVoice([v("Samantha", "en-US"), v("Thomas", "fr-FR")])).toBeNull();
  });

  it("prefers el-GR, then on-device, then default", () => {
    const voices = [
      v("Online Greek", "el-GR", { localService: false }),
      v("Cypriot", "el-CY", { localService: true }),
      v("Melina", "el-GR", { localService: true }),
      v("English", "en-GB", { default: true }),
    ];
    expect(findGreekVoice(voices)?.name).toBe("Melina");
  });

  it("accepts underscore and bare language codes", () => {
    expect(findGreekVoice([v("A", "el_GR")])?.name).toBe("A");
    expect(findGreekVoice([v("B", "el")])?.name).toBe("B");
    expect(findGreekVoice([v("C", "ell")])).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { spokenWordKey } from "./manifest";

describe("spokenWordKey", () => {
  it("is the spoken spelling in lower case, so capitalised forms share a recording", () => {
    expect(spokenWordKey("Ἐν")).toBe("εν");
    expect(spokenWordKey("ἐν")).toBe("εν");
    expect(spokenWordKey("ἀρχῇ")).toBe(spokenWordKey("ἀρχή"));
    expect(spokenWordKey("Ἰησοῦς")).toBe("ιησούς");
  });

  it("keeps the final sigma when lowering", () => {
    expect(spokenWordKey("ΛΟΓΟΣ")).toBe("λογος");
  });
});

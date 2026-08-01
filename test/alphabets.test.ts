import { describe, expect, it } from "vitest";
import { alphabets, deaccent, resolveAlphabet } from "../src/alphabets.js";

describe("resolveAlphabet", () => {
  it("expands a preset name", () => {
    expect(resolveAlphabet("letters")).toBe(alphabets.letters);
  });

  it("passes a custom string through untouched", () => {
    expect(resolveAlphabet(" AB01")).toBe(" AB01");
  });

  it("treats an unknown name as a literal glyph set", () => {
    expect(resolveAlphabet("XYZ")).toBe("XYZ");
  });
});

describe("deaccent", () => {
  it("strips diacritics", () => {
    expect(deaccent("DÉPART")).toBe("DEPART");
    expect(deaccent("Où ça ?")).toBe("Ou ca ?");
  });

  it("leaves unaccented text alone", () => {
    expect(deaccent("BOARDING")).toBe("BOARDING");
  });
});

describe("alphabets", () => {
  it("starts every preset with a blank, so an empty flap is at rest", () => {
    for (const [name, chars] of Object.entries(alphabets)) {
      expect(chars[0], `${name} should begin with a space`).toBe(" ");
    }
  });

  it("contains no duplicate glyphs, which would make travel ambiguous", () => {
    for (const [name, chars] of Object.entries(alphabets)) {
      expect(new Set(chars).size, `${name} has a repeated glyph`).toBe(
        chars.length,
      );
    }
  });
});

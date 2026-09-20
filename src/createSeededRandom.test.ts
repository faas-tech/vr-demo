import { describe, expect, it } from "vitest";
import { createSeededRandom } from "./createSeededRandom";

describe("createSeededRandom", () => {
  it("returns the same sequence when the seed is the same", () => {
    const firstGenerator = createSeededRandom(42);
    const secondGenerator = createSeededRandom(42);

    const firstSequence = Array.from({ length: 20 }, () => firstGenerator());
    const secondSequence = Array.from({ length: 20 }, () => secondGenerator());

    expect(firstSequence).toEqual(secondSequence);
  });

  it("returns a different sequence when the seed changes", () => {
    const firstGenerator = createSeededRandom(42);
    const secondGenerator = createSeededRandom(43);

    const firstSequence = Array.from({ length: 8 }, () => firstGenerator());
    const secondSequence = Array.from({ length: 8 }, () => secondGenerator());

    expect(firstSequence).not.toEqual(secondSequence);
  });

  it("returns values in the 0 to 1 range, excluding 1", () => {
    const nextRandom = createSeededRandom(7);
    const values = Array.from({ length: 50 }, () => nextRandom());

    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});

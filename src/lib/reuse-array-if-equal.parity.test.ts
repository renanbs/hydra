import { describe, expect, it } from "vitest";
import { reuseArrayIfEqual } from "./reuse-array-if-equal";

describe("reuseArrayIfEqual", () => {
  it("returns the previous array when every element is identical", () => {
    const a = { id: 1 };
    const previous = [a];
    expect(reuseArrayIfEqual(previous, [a])).toBe(previous);
  });

  it("returns a copy when length or an element changed", () => {
    const previous = [{ id: 1 }];
    expect(reuseArrayIfEqual(previous, [{ id: 1 }])).not.toBe(previous);
    expect(reuseArrayIfEqual(previous, [])).not.toBe(previous);
    expect(reuseArrayIfEqual(null, previous)).not.toBe(previous);
  });
});

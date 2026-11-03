import { describe, expect, it } from "vitest";
import {
  collectUsedNames,
  getSuggestedCreatureName,
  shouldApplySuggestedName,
} from "./worktree-name-suggestions";
import { MARINE_CREATURES } from "../../shared/marine-creatures";

const pool = new Set(MARINE_CREATURES.map((name) => name.toLowerCase()));

describe("worktree name suggestions (Orca parity)", () => {
  it("offers a creature name from the shared pool", () => {
    const name = getSuggestedCreatureName({}, () => 0);
    expect(pool.has(name)).toBe(true);
  });

  it("dedupes across every repo, using the path basename", () => {
    const worktreesByRepo = {
      "/repo/a": [{ path: "/repo/a/nautilus" }],
      "/repo/b": [{ path: "C:\\repo\\b\\Seahorse" }],
    };
    const used = collectUsedNames(worktreesByRepo);
    expect(used.has("nautilus")).toBe(true);
    expect(used.has("seahorse")).toBe(true);
    const first = MARINE_CREATURES[0].toLowerCase();
    expect(getSuggestedCreatureName(worktreesByRepo, () => 0)).not.toBe(first);
  });

  it("never reissues a retired name and degrades to suffixed tiers", () => {
    const usedAll = Object.fromEntries(
      MARINE_CREATURES.map((name, index) => [
        `/repo/${index}`,
        [{ path: `/repo/${index}/${name}` }],
      ])
    );
    const name = getSuggestedCreatureName(usedAll, () => 0);
    expect(name).toMatch(/-2$/);
    expect(
      getSuggestedCreatureName(usedAll, () => 0, {
        exhaustedTiers: 2,
        names: [],
      })
    ).toMatch(/-3$/);
  });

  it("only overwrites an untouched or still-suggested field", () => {
    expect(shouldApplySuggestedName("", "Nautilus")).toBe(true);
    expect(shouldApplySuggestedName("Nautilus", "Nautilus")).toBe(true);
    expect(shouldApplySuggestedName("feat/login", "Nautilus")).toBe(false);
  });
});

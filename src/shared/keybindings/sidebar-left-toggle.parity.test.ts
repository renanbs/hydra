// D01-052: the left-sidebar toggle is a first-class command in the keybinding
// registry. App's global keydown path dispatches it through `keybindingMatchesAction`
// (instead of a raw `e.key === "b"` check), so the default Mod+B chord, the
// conflict-free remap and the disable state all resolve from the registry.
import { describe, expect, it } from "vitest";
import { keybindingMatchesAction } from "./matching";
import { getShortcutPlatform } from "../../lib/shortcut-platform";

const PLATFORM = getShortcutPlatform();
const MOD_B = { key: "b", code: "KeyB", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false };

describe("sidebar.left.toggle registry command (D01-052)", () => {
  it("matches its default Mod+B chord", () => {
    expect(keybindingMatchesAction("sidebar.left.toggle", MOD_B, PLATFORM)).toBe(true);
  });

  it("does not fire on an unmodified b", () => {
    expect(
      keybindingMatchesAction(
        "sidebar.left.toggle",
        { key: "b", code: "KeyB", ctrlKey: false, metaKey: false },
        PLATFORM
      )
    ).toBe(false);
  });

  it("follows a user remap", () => {
    const overrides = { "sidebar.left.toggle": ["Ctrl+Alt+B"] };
    expect(keybindingMatchesAction("sidebar.left.toggle", MOD_B, PLATFORM, overrides)).toBe(false);
    expect(
      keybindingMatchesAction(
        "sidebar.left.toggle",
        { key: "b", code: "KeyB", ctrlKey: true, altKey: true },
        PLATFORM,
        overrides
      )
    ).toBe(true);
  });

  it("stays silent once the user disables the command", () => {
    expect(
      keybindingMatchesAction("sidebar.left.toggle", MOD_B, PLATFORM, {
        "sidebar.left.toggle": []
      })
    ).toBe(false);
  });
});

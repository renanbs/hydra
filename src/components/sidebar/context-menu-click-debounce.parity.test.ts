import { describe, expect, it } from "vitest";
import {
  CONTEXT_MENU_CLICK_SUPPRESSION_MS,
  shouldSuppressContextMenuFollowUpClick,
} from "./context-menu-click-debounce";

describe("context menu follow-up click suppression (Orca parity)", () => {
  it("suppresses a click within the 500ms window", () => {
    expect(shouldSuppressContextMenuFollowUpClick(1_000, 1_000)).toBe(true);
    expect(
      shouldSuppressContextMenuFollowUpClick(
        1_000,
        1_000 + CONTEXT_MENU_CLICK_SUPPRESSION_MS - 1
      )
    ).toBe(true);
  });

  it("lets clicks through once the window elapsed", () => {
    expect(
      shouldSuppressContextMenuFollowUpClick(1_000, 1_000 + CONTEXT_MENU_CLICK_SUPPRESSION_MS)
    ).toBe(false);
  });
});

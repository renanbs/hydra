import { describe, expect, it } from "vitest";
import { resolveLeftSidebarStyleVariables } from "./left-sidebar-appearance";
import { DEFAULT_HYDRA_SETTINGS } from "../shared/settings-types";

const BASE = DEFAULT_HYDRA_SETTINGS;

describe("resolveLeftSidebarStyleVariables (D01-002 appearance surface)", () => {
  it("returns no variables for the default appearance", () => {
    expect(
      resolveLeftSidebarStyleVariables(
        { ...BASE, left_sidebar_appearance_mode: "default" },
        true
      )
    ).toBeUndefined();
  });

  it("paints the tinted branch with both sidebar token families and the surface background", () => {
    const vars = resolveLeftSidebarStyleVariables(
      {
        ...BASE,
        left_sidebar_appearance_mode: "tinted",
        left_sidebar_tint_color: "#336699",
        left_sidebar_tint_opacity: 0.2,
      },
      true
    );

    expect(vars).toBeDefined();
    expect(vars!["--worktree-sidebar"]).toContain("color-mix");
    expect(vars!["--sidebar"]).toBe(vars!["--worktree-sidebar"]);
    expect(vars!.backgroundColor).toBe(vars!["--worktree-sidebar"]);
    expect(vars!.color).toBe("var(--foreground)");
  });

  it("follows the terminal appearance and honors terminal color overrides", () => {
    const overridden = resolveLeftSidebarStyleVariables(
      {
        ...BASE,
        left_sidebar_appearance_mode: "match-terminal",
        terminal_color_overrides: { background: "#123456", foreground: "#fedcba" },
      },
      true
    );

    expect(overridden!["--worktree-sidebar"]).toBe("#123456");
    expect(overridden!["--worktree-sidebar-foreground"]).toBe("#fedcba");
    // overrideTextTokens: the terminal surface paints the surrounding tokens too.
    expect(overridden!["--background"]).toBe(overridden!["--worktree-sidebar"]);
    expect(overridden!["--foreground"]).toBe(overridden!["--worktree-sidebar-foreground"]);
  });

  it("adapts the terminal branch to dark and light system themes", () => {
    const dark = resolveLeftSidebarStyleVariables(
      { ...BASE, left_sidebar_appearance_mode: "match-terminal", theme: "dark" },
      true
    );
    const light = resolveLeftSidebarStyleVariables(
      { ...BASE, left_sidebar_appearance_mode: "match-terminal", theme: "light" },
      false
    );

    expect(dark!["--worktree-sidebar"]).not.toBe(light!["--worktree-sidebar"]);
    expect(dark!["--worktree-sidebar"]).toMatch(/^#/);
    expect(light!["--worktree-sidebar"]).toMatch(/^#/);
  });
});

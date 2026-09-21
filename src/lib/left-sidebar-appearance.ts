import type { HydraSettings } from "../shared/settings-types";
import { resolveEffectiveTerminalAppearance } from "./terminal-theme";

export type LeftSidebarStyleVariables = Record<string, string>;

function buildSurfaceVariables(args: {
  background: string;
  foreground: string;
  overrideTextTokens?: boolean;
}): LeftSidebarStyleVariables {
  const { background, foreground, overrideTextTokens = false } = args;
  const accent = `color-mix(in srgb, ${foreground} 9%, ${background})`;
  const border = `color-mix(in srgb, ${foreground} 7%, ${background})`;
  const ring = `color-mix(in srgb, ${foreground} 44%, ${background})`;
  const vars: LeftSidebarStyleVariables = {
    "--worktree-sidebar": background,
    "--worktree-sidebar-foreground": foreground,
    "--worktree-sidebar-accent": accent,
    "--worktree-sidebar-accent-foreground": foreground,
    "--worktree-sidebar-border": border,
    "--worktree-sidebar-ring": ring,
    "--sidebar": background,
    "--sidebar-foreground": foreground,
    "--sidebar-accent": accent,
    "--sidebar-accent-foreground": foreground,
    "--sidebar-border": border,
    "--sidebar-ring": ring,
    backgroundColor: background,
    color: foreground,
  };
  if (overrideTextTokens) {
    vars["--background"] = background;
    vars["--foreground"] = foreground;
    vars["--card"] = `color-mix(in srgb, ${foreground} 4%, ${background})`;
    vars["--card-foreground"] = foreground;
    vars["--accent"] = `color-mix(in srgb, ${foreground} 9%, ${background})`;
    vars["--accent-foreground"] = foreground;
    vars["--muted"] = `color-mix(in srgb, ${foreground} 7%, ${background})`;
    vars["--muted-foreground"] = `color-mix(in srgb, ${foreground} 62%, ${background})`;
    vars["--border"] = `color-mix(in srgb, ${foreground} 7%, ${background})`;
  }
  return vars;
}

export function resolveLeftSidebarStyleVariables(
  settings: HydraSettings | null | undefined,
  systemPrefersDark: boolean
): LeftSidebarStyleVariables | undefined {
  if (!settings) {
    return undefined;
  }
  const mode = settings.left_sidebar_appearance_mode ?? "default";
  if (mode === "default") {
    return undefined;
  }
  if (mode === "match-terminal") {
    const appearance = resolveEffectiveTerminalAppearance(settings, systemPrefersDark);
    const bg = settings.terminal_color_overrides?.background ?? appearance.theme?.background ?? "#000000";
    const fg = settings.terminal_color_overrides?.foreground ?? appearance.theme?.foreground ?? "#fafafa";
    return buildSurfaceVariables({ background: bg, foreground: fg, overrideTextTokens: true });
  }
  if (mode === "tinted") {
    const tintColor = settings.left_sidebar_tint_color ?? "#336699";
    const tintOpacity = settings.left_sidebar_tint_opacity ?? 0.1;
    const tintPercent = Number((tintOpacity * 100).toFixed(2));
    const bg = `color-mix(in srgb, ${tintColor} ${tintPercent}%, var(--background))`;
    return buildSurfaceVariables({ background: bg, foreground: "var(--foreground)" });
  }
  return undefined;
}

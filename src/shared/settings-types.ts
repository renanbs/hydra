import type { TerminalCustomTheme } from "./terminal-custom-themes";
import type { TerminalColorOverrides } from "./terminal-color-overrides";

export type HydraSettings = {
  // Appearance — faithful to Orca GlobalSettings (snake_case for Rust compat)
  theme: "system" | "dark" | "light";
  terminal_font_family: string;
  terminal_font_size: number;
  terminal_font_weight: number;
  terminal_font_weight_bold: number;
  terminal_line_height: number;
  terminal_cursor_style: "bar" | "block" | "underline";
  terminal_cursor_blink: boolean;
  terminal_gpu_acceleration: "auto" | "on" | "off";
  terminal_ligatures: "auto" | "on" | "off";
  terminal_theme_dark: string;
  terminal_theme_light: string;
  terminal_use_separate_light_theme: boolean;
  terminal_divider_color_dark: string;
  terminal_divider_color_light: string;
  terminal_custom_themes: TerminalCustomTheme[];
  terminal_background_opacity?: number;
  terminal_minimum_contrast_ratio?: number;
  terminal_color_overrides?: TerminalColorOverrides;
  terminal_inactive_pane_opacity: number;
  terminal_active_pane_opacity: number;
  terminal_pane_opacity_transition_ms: number;
  terminal_divider_thickness_px: number;
  terminal_focus_follows_mouse: boolean;
  terminal_scrollback_rows: number;
  primary_selection_middle_click_paste: boolean;
  auto_approve_reads: boolean;
  notification_on_blocked: boolean;
  default_branch_prefix: string;
  workspace_dir: string;
  // Agents — Orca-faithful (AgentsPane.tsx:141)
  default_tui_agent?: string | "blank" | null;
  disabled_tui_agents?: string[];
  agent_status_hooks_enabled?: boolean;
  tab_auto_generate_title?: boolean;
  keep_computer_awake_while_agents_run?: boolean;
  agent_permission_mode?: "yolo" | "manual";
};

export const DEFAULT_HYDRA_SETTINGS: HydraSettings = {
  theme: "system",
  terminal_font_family: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  terminal_font_size: 14,
  terminal_font_weight: 500,
  terminal_font_weight_bold: 700,
  terminal_line_height: 1,
  terminal_cursor_style: "block",
  terminal_cursor_blink: true,
  terminal_gpu_acceleration: "auto",
  terminal_ligatures: "auto",
  terminal_theme_dark: "Ghostty Default Style Dark",
  terminal_theme_light: "Builtin Tango Light",
  terminal_use_separate_light_theme: true,
  terminal_divider_color_dark: "#3f3f46",
  terminal_divider_color_light: "#d4d4d8",
  terminal_custom_themes: [],
  terminal_inactive_pane_opacity: 0.6,
  terminal_active_pane_opacity: 1,
  terminal_pane_opacity_transition_ms: 140,
  terminal_divider_thickness_px: 3,
  terminal_focus_follows_mouse: false,
  terminal_scrollback_rows: 10000,
  primary_selection_middle_click_paste: true,
  auto_approve_reads: true,
  notification_on_blocked: true,
  default_branch_prefix: "feat/",
  workspace_dir: "/home/renan/src",
  default_tui_agent: null,
  disabled_tui_agents: [],
  agent_status_hooks_enabled: true,
  tab_auto_generate_title: false,
  keep_computer_awake_while_agents_run: false,
  agent_permission_mode: "yolo",
};

export function normalizeHydraSettings(input: unknown): HydraSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ...DEFAULT_HYDRA_SETTINGS };
  }
  const raw = input as Record<string, unknown>;
  // Support both snake and camel legacy keys
  const get = (snake: string, camel: string, fallback: unknown) => {
    if (raw[snake] !== undefined) return raw[snake];
    if (raw[camel] !== undefined) return raw[camel];
    return fallback;
  };
  return {
    ...DEFAULT_HYDRA_SETTINGS,
    ...(raw as Partial<HydraSettings>),
    theme: (() => {
      const t = raw.theme;
      if (t === "dark" || t === "light" || t === "system") return t;
      if (t === "oled") return "dark";
      return DEFAULT_HYDRA_SETTINGS.theme;
    })(),
    terminal_font_family: get("terminal_font_family", "terminalFontFamily", DEFAULT_HYDRA_SETTINGS.terminal_font_family) as string,
    terminal_font_size: get("terminal_font_size", "terminalFontSize", DEFAULT_HYDRA_SETTINGS.terminal_font_size) as number,
    terminal_font_weight: get("terminal_font_weight", "terminalFontWeight", DEFAULT_HYDRA_SETTINGS.terminal_font_weight) as number,
    terminal_font_weight_bold: get("terminal_font_weight_bold", "terminalFontWeightBold", DEFAULT_HYDRA_SETTINGS.terminal_font_weight_bold) as number,
    terminal_line_height: get("terminal_line_height", "terminalLineHeight", DEFAULT_HYDRA_SETTINGS.terminal_line_height) as number,
    terminal_cursor_style: get("terminal_cursor_style", "terminalCursorStyle", DEFAULT_HYDRA_SETTINGS.terminal_cursor_style) as HydraSettings["terminal_cursor_style"],
    terminal_cursor_blink: get("terminal_cursor_blink", "terminalCursorBlink", DEFAULT_HYDRA_SETTINGS.terminal_cursor_blink) as boolean,
    terminal_gpu_acceleration: get("terminal_gpu_acceleration", "terminalGpuAcceleration", DEFAULT_HYDRA_SETTINGS.terminal_gpu_acceleration) as HydraSettings["terminal_gpu_acceleration"],
    terminal_ligatures: get("terminal_ligatures", "terminalLigatures", DEFAULT_HYDRA_SETTINGS.terminal_ligatures) as HydraSettings["terminal_ligatures"],
    terminal_theme_dark: get("terminal_theme_dark", "terminalThemeDark", DEFAULT_HYDRA_SETTINGS.terminal_theme_dark) as string,
    terminal_theme_light: get("terminal_theme_light", "terminalThemeLight", DEFAULT_HYDRA_SETTINGS.terminal_theme_light) as string,
    terminal_use_separate_light_theme: get("terminal_use_separate_light_theme", "terminalUseSeparateLightTheme", DEFAULT_HYDRA_SETTINGS.terminal_use_separate_light_theme) as boolean,
    terminal_divider_color_dark: get("terminal_divider_color_dark", "terminalDividerColorDark", DEFAULT_HYDRA_SETTINGS.terminal_divider_color_dark) as string,
    terminal_divider_color_light: get("terminal_divider_color_light", "terminalDividerColorLight", DEFAULT_HYDRA_SETTINGS.terminal_divider_color_light) as string,
    terminal_custom_themes: Array.isArray(raw.terminal_custom_themes ?? (raw as Record<string,unknown>).terminalCustomThemes) ? (raw.terminal_custom_themes ?? (raw as Record<string,unknown>).terminalCustomThemes) as TerminalCustomTheme[] : [],
    terminal_background_opacity: (raw.terminal_background_opacity ?? raw.terminalBackgroundOpacity ?? undefined) as number | undefined,
    terminal_minimum_contrast_ratio: (raw.terminal_minimum_contrast_ratio ?? raw.terminalMinimumContrastRatio ?? undefined) as number | undefined,
    terminal_color_overrides: (raw.terminal_color_overrides ?? raw.terminalColorOverrides ?? undefined) as TerminalColorOverrides | undefined,
    terminal_inactive_pane_opacity: get("terminal_inactive_pane_opacity", "terminalInactivePaneOpacity", DEFAULT_HYDRA_SETTINGS.terminal_inactive_pane_opacity) as number,
    terminal_active_pane_opacity: get("terminal_active_pane_opacity", "terminalActivePaneOpacity", DEFAULT_HYDRA_SETTINGS.terminal_active_pane_opacity) as number,
    terminal_pane_opacity_transition_ms: get("terminal_pane_opacity_transition_ms", "terminalPaneOpacityTransitionMs", DEFAULT_HYDRA_SETTINGS.terminal_pane_opacity_transition_ms) as number,
    terminal_divider_thickness_px: get("terminal_divider_thickness_px", "terminalDividerThicknessPx", DEFAULT_HYDRA_SETTINGS.terminal_divider_thickness_px) as number,
    terminal_focus_follows_mouse: get("terminal_focus_follows_mouse", "terminalFocusFollowsMouse", DEFAULT_HYDRA_SETTINGS.terminal_focus_follows_mouse) as boolean,
    terminal_scrollback_rows: get("terminal_scrollback_rows", "terminalScrollbackRows", DEFAULT_HYDRA_SETTINGS.terminal_scrollback_rows) as number,
  };
}

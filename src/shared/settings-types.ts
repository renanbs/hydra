import type { TerminalCustomTheme } from "./terminal-custom-themes";
import type { TerminalColorOverrides } from "./terminal-color-overrides";

export type OpenInApplication = {
  id: string;
  label: string;
  command: string;
};

export type HydraSettings = {
  // Appearance — faithful to Orca GlobalSettings (snake_case for Rust compat)
  theme: "system" | "dark" | "light";
  app_font_family: string;
  ui_zoom?: number;
  compact_worktree_cards?: boolean;
  left_sidebar_appearance_mode?: "default" | "match-terminal" | "tinted";
  left_sidebar_tint_color?: string;
  left_sidebar_tint_opacity?: number;
  usage_percentage_display?: "used" | "remaining";
  status_bar_claude_usage?: boolean;
  status_bar_antigravity_usage?: boolean;
  status_bar_opencode_usage?: boolean;
  status_bar_minimax_usage?: boolean;
  status_bar_remote_hosts?: boolean;
  status_bar_resource_manager?: boolean;
  status_bar_ports?: boolean;
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
  terminal_cursor_opacity?: number;
  terminal_padding_x?: number;
  terminal_padding_y?: number;
  window_background_blur?: boolean;
  terminal_mouse_hide_while_typing?: boolean;
  terminal_background_opacity?: number;
  terminal_minimum_contrast_ratio?: number;
  terminal_color_overrides?: TerminalColorOverrides;
  terminal_inactive_pane_opacity: number;
  terminal_active_pane_opacity: number;
  terminal_pane_opacity_transition_ms: number;
  terminal_divider_thickness_px: number;
  terminal_focus_follows_mouse: boolean;
  terminal_scrollback_rows: number;
  // Terminal Interaction — Orca TerminalPane faithful (image 1:1)
  terminal_scroll_sensitivity?: number;
  terminal_fast_scroll_sensitivity?: number;
  terminal_tui_scroll_sensitivity?: number;
  terminal_inline_images?: boolean;
  terminal_right_click_to_paste?: boolean;
  terminal_clipboard_on_select?: boolean;
  terminal_copy_trims_gutter?: boolean;
  terminal_allow_osc52_clipboard?: boolean;
  terminal_word_separator?: string;
  terminal_tui_scroll_sensitivity_defaulted_to_one?: boolean;
  // Mac/Win future compat (no UI on Linux yet)
  terminal_mac_option_as_alt?: "auto" | "true" | "false" | "left" | "right";
  terminal_jis_yen_to_backslash?: boolean;
  setup_script_launch_mode?: "new-tab" | "split-vertical" | "split-horizontal";
  primary_selection_middle_click_paste: boolean;
  auto_approve_reads: boolean;
  notification_on_blocked: boolean;
  default_branch_prefix: string;
  workspace_dir: string;
  nest_workspaces: boolean;
  workspace_dir_history: { path: string; nest_workspaces: boolean }[];
  terminal_default_shell: string;
  // Agents — Orca-faithful (AgentsPane.tsx:141)
  default_tui_agent?: string | "blank" | null;
  disabled_tui_agents?: string[];
  agent_status_hooks_enabled?: boolean;
  agent_cmd_overrides?: Record<string, string>;
  agent_default_args?: Record<string, string>;
  agent_default_env?: Record<string, Record<string, string>>;
  tab_auto_generate_title?: boolean;
  keep_computer_awake_while_agents_run?: boolean;
  agent_permission_mode?: "yolo" | "manual";
  // General — Orca-faithful (GeneralPane.tsx)
  ctrl_tab_order_mode?: "mru" | "lru";
  confirm_close_pinned_tab?: boolean;
  skip_close_terminal_with_running_process_confirm?: boolean;
  skip_delete_worktree_confirm?: boolean;
  worktree_visibility_defaults?: {
    external?: "show" | "hide";
    customSources?: { id: string; rootPath: string }[];
    sourcePreferences?: {
      builtIn?: Partial<Record<"claude" | "gsd", "show" | "hide">>;
      custom?: Record<string, "show" | "hide">;
    };
  };
  // Open In Apps — copia Orca shared/open-in-applications.ts
  open_in_applications?: OpenInApplication[];
  // Theme-parity additions (Orca-faithful)
  editor_font_family?: string;
  editor_minimap_enabled?: boolean;
  editor_word_wrap?: boolean;
  terminal_quick_commands?: unknown[];
  terminal_scope_history_by_worktree?: boolean;
  status_bar_items?: string[];
};

export const OPEN_IN_APPLICATIONS_MAX = 8;
export const DEFAULT_OPEN_IN_APPLICATIONS: OpenInApplication[] = [{ id: "vscode", label: "VS Code", command: "code" }];

export function normalizeOpenInApplications(value: unknown): OpenInApplication[] {
  if (!Array.isArray(value)) return [...DEFAULT_OPEN_IN_APPLICATIONS];
  const out: OpenInApplication[] = [];
  const seen = new Set<string>();
  for (const [i, row] of (value as any[]).entries()) {
    if (out.length >= OPEN_IN_APPLICATIONS_MAX) break;
    if (!row || typeof row !== "object") continue;
    const label = typeof (row as any).label === "string" ? (row as any).label.trim() : "";
    const command = typeof (row as any).command === "string" ? (row as any).command.trim() : "";
    if (!label || !command) continue;
    let id = typeof (row as any).id === "string" ? (row as any).id.trim() : "";
    if (!id) id = `open-in-${i+1}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label, command });
  }
  return out;
}

export const DEFAULT_HYDRA_SETTINGS: HydraSettings = {
  theme: "system",
  ui_zoom: 1,
  compact_worktree_cards: false,
  left_sidebar_appearance_mode: "default",
  left_sidebar_tint_color: "#336699",
  left_sidebar_tint_opacity: 0.1,
  usage_percentage_display: "used",
  status_bar_claude_usage: true,
  status_bar_antigravity_usage: true,
  status_bar_opencode_usage: true,
  status_bar_minimax_usage: true,
  status_bar_remote_hosts: true,
  status_bar_resource_manager: true,
  status_bar_ports: true,
  app_font_family: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
  terminal_cursor_opacity: 1,
  terminal_padding_x: 4,
  terminal_padding_y: 4,
  window_background_blur: false,
  terminal_mouse_hide_while_typing: false,
  editor_font_family: undefined,
  editor_minimap_enabled: true,
  editor_word_wrap: true,
  terminal_quick_commands: undefined,
  terminal_scope_history_by_worktree: true,
  status_bar_items: ["resource-usage", "ports", "ssh", "claude", "codex"],
  terminal_inactive_pane_opacity: 0.6,
  terminal_active_pane_opacity: 1,
  terminal_pane_opacity_transition_ms: 140,
  terminal_divider_thickness_px: 3,
  terminal_focus_follows_mouse: false,
  terminal_scrollback_rows: 10000,
  terminal_scroll_sensitivity: 1.15,
  terminal_fast_scroll_sensitivity: 5,
  terminal_tui_scroll_sensitivity: 1,
  terminal_inline_images: true,
  terminal_right_click_to_paste: false,
  terminal_clipboard_on_select: true,
  terminal_copy_trims_gutter: true,
  terminal_allow_osc52_clipboard: true,
  terminal_word_separator: undefined,
  setup_script_launch_mode: "new-tab",
  primary_selection_middle_click_paste: true,
  auto_approve_reads: true,
  notification_on_blocked: true,
  default_branch_prefix: "feat/",
  workspace_dir: "/home/renan/src",
  nest_workspaces: true,
  workspace_dir_history: [],
  terminal_default_shell: "",
  default_tui_agent: null,
  disabled_tui_agents: [],
  agent_status_hooks_enabled: true,
  agent_cmd_overrides: {},
  agent_default_args: {},
  agent_default_env: {},
  tab_auto_generate_title: false,
  keep_computer_awake_while_agents_run: false,
  agent_permission_mode: "yolo",
  ctrl_tab_order_mode: "mru",
  confirm_close_pinned_tab: true,
  skip_close_terminal_with_running_process_confirm: false,
  skip_delete_worktree_confirm: false,
  worktree_visibility_defaults: { external: "hide", customSources: [], sourcePreferences: { builtIn: {}, custom: {} } },
  open_in_applications: [...DEFAULT_OPEN_IN_APPLICATIONS],
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
    app_font_family: get("app_font_family", "appFontFamily", DEFAULT_HYDRA_SETTINGS.app_font_family) as string,
    terminal_font_family: get("terminal_font_family", "terminalFontFamily", DEFAULT_HYDRA_SETTINGS.terminal_font_family) as string,
    terminal_font_size: get("terminal_font_size", "terminalFontSize", DEFAULT_HYDRA_SETTINGS.terminal_font_size) as number,
    ui_zoom: (() => { const v = get("ui_zoom", "uiZoom", DEFAULT_HYDRA_SETTINGS.ui_zoom); return typeof v === "number" && Number.isFinite(v) ? Math.min(2, Math.max(0.5, v)) : 1; })(),
    compact_worktree_cards: Boolean(get("compact_worktree_cards", "compactWorktreeCards", DEFAULT_HYDRA_SETTINGS.compact_worktree_cards)),
    left_sidebar_appearance_mode: (() => { const v = get("left_sidebar_appearance_mode", "leftSidebarAppearanceMode", "default"); return v === "match-terminal" || v === "tinted" ? v : "default"; })(),
    left_sidebar_tint_color: String(get("left_sidebar_tint_color", "leftSidebarTintColor", "#336699")),
    left_sidebar_tint_opacity: (() => { const v = get("left_sidebar_tint_opacity", "leftSidebarTintOpacity", 0.1); return typeof v === "number" && Number.isFinite(v) ? Math.min(0.5, Math.max(0, v)) : 0.1; })(),
    usage_percentage_display: (() => { const v = get("usage_percentage_display", "usagePercentageDisplay", "used"); return v === "remaining" ? "remaining" : "used"; })(),
    status_bar_claude_usage: Boolean(get("status_bar_claude_usage", "statusBarClaudeUsage", true)),
    status_bar_antigravity_usage: Boolean(get("status_bar_antigravity_usage", "statusBarAntigravityUsage", true)),
    status_bar_opencode_usage: Boolean(get("status_bar_opencode_usage", "statusBarOpencodeUsage", true)),
    status_bar_minimax_usage: Boolean(get("status_bar_minimax_usage", "statusBarMinimaxUsage", true)),
    status_bar_remote_hosts: Boolean(get("status_bar_remote_hosts", "statusBarRemoteHosts", true)),
    status_bar_resource_manager: Boolean(get("status_bar_resource_manager", "statusBarResourceManager", true)),
    status_bar_ports: Boolean(get("status_bar_ports", "statusBarPorts", true)),
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
    terminal_cursor_opacity: (() => { const v = get("terminal_cursor_opacity", "terminalCursorOpacity", 1); return typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1; })(),
    terminal_padding_x: (() => { const v = get("terminal_padding_x", "terminalPaddingX", 4); return typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 4; })(),
    terminal_padding_y: (() => { const v = get("terminal_padding_y", "terminalPaddingY", 4); return typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 4; })(),
    window_background_blur: Boolean(get("window_background_blur", "windowBackgroundBlur", false)),
    terminal_mouse_hide_while_typing: Boolean(get("terminal_mouse_hide_while_typing", "terminalMouseHideWhileTyping", false)),
    terminal_minimum_contrast_ratio: (raw.terminal_minimum_contrast_ratio ?? raw.terminalMinimumContrastRatio ?? undefined) as number | undefined,
    terminal_color_overrides: (raw.terminal_color_overrides ?? raw.terminalColorOverrides ?? undefined) as TerminalColorOverrides | undefined,
    terminal_inactive_pane_opacity: get("terminal_inactive_pane_opacity", "terminalInactivePaneOpacity", DEFAULT_HYDRA_SETTINGS.terminal_inactive_pane_opacity) as number,
    terminal_active_pane_opacity: get("terminal_active_pane_opacity", "terminalActivePaneOpacity", DEFAULT_HYDRA_SETTINGS.terminal_active_pane_opacity) as number,
    terminal_pane_opacity_transition_ms: get("terminal_pane_opacity_transition_ms", "terminalPaneOpacityTransitionMs", DEFAULT_HYDRA_SETTINGS.terminal_pane_opacity_transition_ms) as number,
    terminal_divider_thickness_px: get("terminal_divider_thickness_px", "terminalDividerThicknessPx", DEFAULT_HYDRA_SETTINGS.terminal_divider_thickness_px) as number,
    terminal_focus_follows_mouse: get("terminal_focus_follows_mouse", "terminalFocusFollowsMouse", DEFAULT_HYDRA_SETTINGS.terminal_focus_follows_mouse) as boolean,
    terminal_scrollback_rows: get("terminal_scrollback_rows", "terminalScrollbackRows", DEFAULT_HYDRA_SETTINGS.terminal_scrollback_rows) as number,
    terminal_scroll_sensitivity: (() => { const v = get("terminal_scroll_sensitivity","terminalScrollSensitivity", DEFAULT_HYDRA_SETTINGS.terminal_scroll_sensitivity) as number; return typeof v==="number"&&Number.isFinite(v)? Math.min(3,Math.max(0.5,v)) : DEFAULT_HYDRA_SETTINGS.terminal_scroll_sensitivity!; })() as number,
    terminal_fast_scroll_sensitivity: (() => { const v = get("terminal_fast_scroll_sensitivity","terminalFastScrollSensitivity", DEFAULT_HYDRA_SETTINGS.terminal_fast_scroll_sensitivity) as number; return typeof v==="number"&&Number.isFinite(v)? Math.min(10,Math.max(1,v)) : DEFAULT_HYDRA_SETTINGS.terminal_fast_scroll_sensitivity!; })() as number,
    terminal_tui_scroll_sensitivity: (() => { const v = get("terminal_tui_scroll_sensitivity","terminalTuiScrollSensitivity", DEFAULT_HYDRA_SETTINGS.terminal_tui_scroll_sensitivity) as number; return typeof v==="number"&&Number.isFinite(v)? Math.min(10,Math.max(1,v)) : DEFAULT_HYDRA_SETTINGS.terminal_tui_scroll_sensitivity!; })() as number,
    terminal_inline_images: get("terminal_inline_images","terminalInlineImages", DEFAULT_HYDRA_SETTINGS.terminal_inline_images) as boolean,
    terminal_right_click_to_paste: get("terminal_right_click_to_paste","terminalRightClickToPaste", DEFAULT_HYDRA_SETTINGS.terminal_right_click_to_paste) as boolean,
    terminal_clipboard_on_select: get("terminal_clipboard_on_select","terminalClipboardOnSelect", DEFAULT_HYDRA_SETTINGS.terminal_clipboard_on_select) as boolean,
    terminal_copy_trims_gutter: get("terminal_copy_trims_gutter","terminalCopyTrimsGutter", DEFAULT_HYDRA_SETTINGS.terminal_copy_trims_gutter) as boolean,
    terminal_allow_osc52_clipboard: get("terminal_allow_osc52_clipboard","terminalAllowOsc52Clipboard", DEFAULT_HYDRA_SETTINGS.terminal_allow_osc52_clipboard) as boolean,
    terminal_word_separator: (get("terminal_word_separator","terminalWordSeparator", DEFAULT_HYDRA_SETTINGS.terminal_word_separator) as string | undefined) || undefined,
    setup_script_launch_mode: (() => { const v = get("setup_script_launch_mode","setupScriptLaunchMode", DEFAULT_HYDRA_SETTINGS.setup_script_launch_mode) as string; return v==="split-vertical"||v==="split-horizontal"||v==="new-tab"? v : "new-tab"; })() as HydraSettings["setup_script_launch_mode"],
    nest_workspaces: get("nest_workspaces", "nestWorkspaces", DEFAULT_HYDRA_SETTINGS.nest_workspaces) as boolean,
    workspace_dir_history: (() => {
      const rawHist = (raw as Record<string, unknown>).workspace_dir_history ?? (raw as Record<string, unknown>).workspaceDirHistory;
      if (Array.isArray(rawHist)) {
        return (rawHist as Array<Record<string, unknown>>).map((h) => ({
          path: String(h.path ?? ""),
          nest_workspaces: Boolean((h as Record<string, unknown>).nest_workspaces ?? (h as Record<string, unknown>).nestWorkspaces ?? true),
        })).filter((h) => h.path);
      }
      return DEFAULT_HYDRA_SETTINGS.workspace_dir_history;
    })(),
    ctrl_tab_order_mode: (() => {
      const v = raw.ctrl_tab_order_mode ?? (raw as Record<string, unknown>).ctrlTabOrderMode;
      return v === "lru" ? "lru" : "mru";
    })() as HydraSettings["ctrl_tab_order_mode"],
    confirm_close_pinned_tab: get("confirm_close_pinned_tab", "confirmClosePinnedTab", DEFAULT_HYDRA_SETTINGS.confirm_close_pinned_tab) as boolean,
    skip_close_terminal_with_running_process_confirm: get("skip_close_terminal_with_running_process_confirm", "skipCloseTerminalWithRunningProcessConfirm", DEFAULT_HYDRA_SETTINGS.skip_close_terminal_with_running_process_confirm) as boolean,
    skip_delete_worktree_confirm: get("skip_delete_worktree_confirm", "skipDeleteWorktreeConfirm", DEFAULT_HYDRA_SETTINGS.skip_delete_worktree_confirm) as boolean,
    worktree_visibility_defaults: (() => {
      const rawWvd = (raw as Record<string, unknown>).worktree_visibility_defaults ?? (raw as Record<string, unknown>).worktreeVisibilityDefaults;
      if (rawWvd && typeof rawWvd === "object" && !Array.isArray(rawWvd)) {
        const w = rawWvd as Record<string, unknown>;
        const ext = w.external === "show" ? "show" : "hide";
        const cs = Array.isArray(w.customSources ?? (w as Record<string, unknown>).custom_sources)
          ? ((w.customSources ?? (w as Record<string, unknown>).custom_sources) as Array<Record<string, unknown>>).map((c) => ({ id: String(c.id ?? ""), rootPath: String(c.rootPath ?? c.root_path ?? "") })).filter((c) => c.id && c.rootPath)
          : [];
        const spRaw = (w.sourcePreferences ?? (w as Record<string, unknown>).source_preferences) as Record<string, unknown> | undefined;
        let sp: any = undefined;
        if (spRaw && typeof spRaw === "object") {
          const builtIn = (spRaw as Record<string, unknown>).builtIn ?? (spRaw as Record<string, unknown>).built_in;
          const custom = (spRaw as Record<string, unknown>).custom;
          sp = {
            ...(builtIn && typeof builtIn === "object" ? { builtIn: builtIn as Record<string, "show"|"hide"> } : {}),
            ...(custom && typeof custom === "object" ? { custom: custom as Record<string, "show"|"hide"> } : {}),
          };
        }
        return { external: ext, customSources: cs, sourcePreferences: (sp ?? { builtIn: {}, custom: {} }) };
      }
      return DEFAULT_HYDRA_SETTINGS.worktree_visibility_defaults;
    })(),
    open_in_applications: normalizeOpenInApplications((raw as Record<string, unknown>).open_in_applications ?? (raw as Record<string, unknown>).openInApplications),
  };
}

use parking_lot::Mutex;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub id: i64,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub created_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DbSessionRecord {
    pub id: String,
    pub project_path: String,
    pub title: String,
    pub branch: String,
    pub agent_name: String,
    pub executable: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ToolApprovalRecord {
    pub id: String,
    pub session_id: String,
    pub tool_name: String,
    pub command: String,
    pub status: String,
    pub created_at: i64,
}

// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Orca: shared/agent-status-types.ts AgentStateHistoryEntry + AGENT_STATE_HISTORY_MAX.

/// Uma transição de estado de agente persistida (PR-6). `state` é a string do
/// contrato `agent:state` (working/blocked/waiting/idle/done/unknown) e
/// `started_at` o epoch ms em que o estado passou a valer.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AgentStateHistoryRecord {
    pub state: String,
    pub started_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UiLayoutState {
    pub left_sidebar_open: bool,
    pub right_sidebar_open: bool,
    pub left_sidebar_width: u32,
    pub right_sidebar_width: u32,
}

impl Default for UiLayoutState {
    fn default() -> Self {
        Self {
            left_sidebar_open: true,
            right_sidebar_open: true,
            left_sidebar_width: 260,
            right_sidebar_width: 360,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WorkbenchState {
    pub tabs_json: String,
    pub active_tab_id: String,
    pub updated_at: i64,
}

impl Default for WorkbenchState {
    fn default() -> Self {
        Self {
            tabs_json: "[]".to_string(),
            active_tab_id: "".to_string(),
            updated_at: 0,
        }
    }
}

fn default_theme() -> String { "system".to_string() }
fn default_app_font_family() -> String { "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif".to_string() }
fn default_terminal_font_family() -> String { "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace".to_string() }
fn default_terminal_font_size() -> u32 { 14 }
fn default_terminal_font_weight() -> u32 { 500 }
fn default_terminal_font_weight_bold() -> u32 { 700 }
fn default_terminal_line_height() -> f32 { 1.0 }
fn default_terminal_cursor_style() -> String { "block".to_string() }
fn default_true() -> bool { true }
fn default_false() -> bool { false }
fn default_terminal_gpu() -> String { "auto".to_string() }
fn default_terminal_ligatures() -> String { "auto".to_string() }
fn default_terminal_theme_dark() -> String { "Ghostty Default Style Dark".to_string() }
fn default_terminal_theme_light() -> String { "Builtin Tango Light".to_string() }
fn default_divider_dark() -> String { "#3f3f46".to_string() }
fn default_divider_light() -> String { "#d4d4d8".to_string() }
fn default_inactive_opacity() -> f32 { 0.6 }
fn default_active_opacity() -> f32 { 1.0 }
fn default_transition_ms() -> u32 { 140 }
fn default_divider_thickness() -> u32 { 3 }
fn default_scrollback() -> u32 { 10000 }
fn default_branch_prefix() -> String { "feat/".to_string() }
fn default_agent_perm() -> String { "yolo".to_string() }
fn default_scroll_sensitivity() -> f32 { 1.15 }
fn default_fast_scroll_sensitivity() -> f32 { 5.0 }
fn default_tui_scroll_sensitivity() -> f32 { 1.0 }
fn default_setup_script_launch_mode() -> String { "new-tab".to_string() }

/// Best-effort home directory for this user: `$HOME`, then the passwd entry of
/// the effective uid (via `libc::getpwuid_r`), then a neutral temp dir.
/// Bug #14: the old fallback hardcoded "/home/renan", leaking a developer's
/// HOME into the default workspace dir when `$HOME` was unset.
pub fn user_home_dir() -> PathBuf {
    if let Ok(home) = std::env::var("HOME") {
        if !home.is_empty() {
            return PathBuf::from(home);
        }
    }
    if let Some(home) = passwd_home_dir() {
        return home;
    }
    std::env::temp_dir()
}

#[cfg(unix)]
fn passwd_home_dir() -> Option<PathBuf> {
    use std::ffi::CStr;
    unsafe {
        let uid = libc::geteuid();
        let mut pwd: libc::passwd = std::mem::zeroed();
        let mut buf = vec![0u8; 4096];
        let mut result: *mut libc::passwd = std::ptr::null_mut();
        let rc = libc::getpwuid_r(
            uid,
            &mut pwd,
            buf.as_mut_ptr() as *mut libc::c_char,
            buf.len(),
            &mut result,
        );
        if rc == 0 && !result.is_null() {
            let home = CStr::from_ptr(pwd.pw_dir).to_string_lossy();
            if !home.is_empty() {
                return Some(PathBuf::from(home.into_owned()));
            }
        }
        None
    }
}

#[cfg(not(unix))]
fn passwd_home_dir() -> Option<PathBuf> {
    None
}

fn default_workspace_dir() -> String {
    user_home_dir().join("src").to_string_lossy().to_string()
}
fn default_nest_workspaces() -> bool { true }
fn default_ctrl_tab_order_mode() -> String { "mru".to_string() }
fn default_ui_zoom() -> f32 { 1.0 }
fn default_left_sidebar_appearance_mode() -> String { "default".to_string() }
fn default_left_sidebar_tint_color() -> String { "#336699".to_string() }
fn default_left_sidebar_tint_opacity() -> f32 { 0.1 }
fn default_usage_percentage_display() -> String { "used".to_string() }
fn default_cursor_opacity() -> f32 { 1.0 }
fn default_padding() -> u32 { 4 }
fn default_status_bar_items() -> Vec<String> { vec!["resource-usage".to_string(), "ports".to_string(), "ssh".to_string(), "claude".to_string(), "codex".to_string()] }

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct OrcaWorkspaceLayout {
    #[serde(default)]
    pub path: String,
    #[serde(default = "default_nest_workspaces")]
    pub nest_workspaces: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct CustomWorktreeSource {
    #[serde(default)]
    pub id: String,
    // Wire format is the camelCase the frontend writes/reads (bug #8: the old
    // snake-only field dropped the frontend's `rootPath` key on save, and the
    // duplicates emitted both keys). Snake alias keeps old persisted JSON valid.
    #[serde(default, rename = "rootPath", alias = "root_path")]
    pub root_path: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct SourcePreferences {
    #[serde(default, rename = "builtIn", alias = "built_in")]
    pub built_in: Option<std::collections::HashMap<String, String>>,
    #[serde(default)]
    pub custom: Option<std::collections::HashMap<String, String>>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct OpenInApplication {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub command: String,
}
fn default_open_in_applications() -> Vec<OpenInApplication> { vec![OpenInApplication { id: "vscode".to_string(), label: "VS Code".to_string(), command: "code".to_string() }] }

// Bug #8: custom_sources and customSources used to be separate fields, so BOTH
// were serialized and readers of one never saw the other's data. Now a single
// field per logical value: serialized as the canonical camelCase the frontend
// writes/reads, deserialized via the manual impl below which tolerates legacy
// JSON carrying BOTH spellings (the old derive would fail with
// "duplicate field" on such payloads, breaking get_settings for users with
// existing saved settings).
#[derive(Serialize, Clone, Debug, Default)]
pub struct WorktreeVisibilityDefaults {
    #[serde(default)]
    pub external: Option<String>,
    #[serde(rename = "customSources")]
    pub custom_sources: Option<Vec<CustomWorktreeSource>>,
    #[serde(rename = "sourcePreferences")]
    pub source_preferences: Option<SourcePreferences>,
}

// Deserialization-only shape mirroring the pre-fix struct (distinct fields per
// spelling) so legacy JSON with duplicate keys never trips serde's
// duplicate-field guard. The public struct collapses to a single value.
#[allow(non_snake_case)]
#[derive(Deserialize)]
struct WorktreeVisibilityDefaultsRaw {
    #[serde(default)]
    external: Option<String>,
    #[serde(default)]
    custom_sources: Option<Vec<CustomWorktreeSource>>,
    #[serde(default)]
    customSources: Option<Vec<CustomWorktreeSource>>,
    #[serde(default)]
    source_preferences: Option<SourcePreferences>,
    #[serde(default)]
    sourcePreferences: Option<SourcePreferences>,
}

impl<'de> Deserialize<'de> for WorktreeVisibilityDefaults {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let raw = WorktreeVisibilityDefaultsRaw::deserialize(deserializer)?;
        // When both spellings are present (legacy JSON), the camelCase entry
        // wins — it is the canonical shape the frontend writes today; the two
        // always carried identical values in the buggy version.
        Ok(WorktreeVisibilityDefaults {
            external: raw.external,
            custom_sources: raw.customSources.or(raw.custom_sources),
            source_preferences: raw.sourcePreferences.or(raw.source_preferences),
        })
    }
}
fn deserialize_theme<'de, D>(deserializer: D) -> Result<String, D::Error>
where D: serde::Deserializer<'de> {
    let s = String::deserialize(deserializer)?;
    Ok(match s.as_str() {
        "dark" | "light" | "system" => s,
        "oled" => "dark".to_string(),
        _ => "system".to_string(),
    })
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct TerminalColorOverrides {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub foreground: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cursorAccent: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub selectionBackground: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub selectionForeground: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub black: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub red: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub green: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub yellow: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub blue: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub magenta: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cyan: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub white: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightBlack: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightRed: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightGreen: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightYellow: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightBlue: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightMagenta: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightCyan: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightWhite: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TerminalCustomTheme {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default = "default_terminal_custom_source")]
    pub source: String,
    #[serde(default = "default_terminal_custom_mode")]
    pub mode: String,
    #[serde(default)]
    pub terminal: TerminalColorOverrides,
    #[serde(default)]
    pub importedAt: String,
}
fn default_terminal_custom_source() -> String { "manual".to_string() }
fn default_terminal_custom_mode() -> String { "unknown".to_string() }

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HydraSettings {
    #[serde(default = "default_theme", deserialize_with = "deserialize_theme")]
    pub theme: String,
    #[serde(default = "default_app_font_family")]
    pub app_font_family: String,
    #[serde(default = "default_terminal_font_family")]
    pub terminal_font_family: String,
    #[serde(default = "default_terminal_font_size")]
    pub terminal_font_size: u32,
    #[serde(default = "default_terminal_font_weight")]
    pub terminal_font_weight: u32,
    #[serde(default = "default_terminal_font_weight_bold")]
    pub terminal_font_weight_bold: u32,
    #[serde(default = "default_terminal_line_height")]
    pub terminal_line_height: f32,
    #[serde(default = "default_terminal_cursor_style")]
    pub terminal_cursor_style: String,
    #[serde(default = "default_true")]
    pub terminal_cursor_blink: bool,
    #[serde(default = "default_terminal_gpu")]
    pub terminal_gpu_acceleration: String,
    #[serde(default = "default_terminal_ligatures")]
    pub terminal_ligatures: String,
    #[serde(default = "default_terminal_theme_dark")]
    pub terminal_theme_dark: String,
    #[serde(default = "default_terminal_theme_light")]
    pub terminal_theme_light: String,
    #[serde(default = "default_true")]
    pub terminal_use_separate_light_theme: bool,
    #[serde(default = "default_divider_dark")]
    pub terminal_divider_color_dark: String,
    #[serde(default = "default_divider_light")]
    pub terminal_divider_color_light: String,
    #[serde(default)]
    pub terminal_custom_themes: Vec<TerminalCustomTheme>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub terminal_background_opacity: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub terminal_minimum_contrast_ratio: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub terminal_color_overrides: Option<TerminalColorOverrides>,
    #[serde(default = "default_inactive_opacity")]
    pub terminal_inactive_pane_opacity: f32,
    #[serde(default = "default_active_opacity")]
    pub terminal_active_pane_opacity: f32,
    #[serde(default = "default_transition_ms")]
    pub terminal_pane_opacity_transition_ms: u32,
    #[serde(default = "default_divider_thickness")]
    pub terminal_divider_thickness_px: u32,
    #[serde(default = "default_false")]
    pub terminal_focus_follows_mouse: bool,
    #[serde(default = "default_scrollback")]
    pub terminal_scrollback_rows: u32,
    #[serde(default = "default_scroll_sensitivity")]
    pub terminal_scroll_sensitivity: f32,
    #[serde(default = "default_fast_scroll_sensitivity")]
    pub terminal_fast_scroll_sensitivity: f32,
    #[serde(default = "default_tui_scroll_sensitivity")]
    pub terminal_tui_scroll_sensitivity: f32,
    #[serde(default = "default_true")]
    pub terminal_inline_images: bool,
    #[serde(default = "default_false")]
    pub terminal_right_click_to_paste: bool,
    #[serde(default = "default_true")]
    pub terminal_clipboard_on_select: bool,
    #[serde(default = "default_true")]
    pub terminal_copy_trims_gutter: bool,
    #[serde(default = "default_true")]
    pub terminal_allow_osc52_clipboard: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub terminal_word_separator: Option<String>,
    #[serde(default = "default_setup_script_launch_mode")]
    pub setup_script_launch_mode: String,
    #[serde(default = "default_true")]
    pub primary_selection_middle_click_paste: bool,
    #[serde(default = "default_true")]
    pub auto_approve_reads: bool,
    #[serde(default = "default_true")]
    pub notification_on_blocked: bool,
    #[serde(default = "default_branch_prefix")]
    pub default_branch_prefix: String,
    #[serde(default = "default_workspace_dir")]
    pub workspace_dir: String,
    #[serde(default = "default_nest_workspaces")]
    pub nest_workspaces: bool,
    #[serde(default)]
    pub workspace_dir_history: Vec<OrcaWorkspaceLayout>,
    #[serde(default = "default_ctrl_tab_order_mode")]
    pub ctrl_tab_order_mode: String,
    #[serde(default = "default_true")]
    pub confirm_close_pinned_tab: bool,
    #[serde(default = "default_false")]
    pub skip_close_terminal_with_running_process_confirm: bool,
    #[serde(default = "default_false")]
    pub skip_delete_worktree_confirm: bool,
    #[serde(default, alias = "worktreeVisibilityDefaults")]
    pub worktree_visibility_defaults: Option<WorktreeVisibilityDefaults>,
    #[serde(default)]
    pub terminal_default_shell: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_tui_agent: Option<String>,
    #[serde(default)]
    pub disabled_tui_agents: Vec<String>,
    #[serde(default = "default_true")]
    pub agent_status_hooks_enabled: bool,
    #[serde(default = "default_false")]
    pub tab_auto_generate_title: bool,
    #[serde(default = "default_false")]
    pub keep_computer_awake_while_agents_run: bool,
    #[serde(default = "default_agent_perm")]
    pub agent_permission_mode: String,
    #[serde(default)]
    pub agent_cmd_overrides: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub agent_default_args: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub agent_default_env: std::collections::HashMap<String, std::collections::HashMap<String, String>>,
    #[serde(default = "default_open_in_applications", alias = "openInApplications")]
    pub open_in_applications: Vec<OpenInApplication>,
    #[serde(default = "default_ui_zoom", alias = "uiZoom")]
    pub ui_zoom: f32,
    #[serde(default = "default_false", alias = "compactWorktreeCards")]
    pub compact_worktree_cards: bool,
    #[serde(default = "default_left_sidebar_appearance_mode", alias = "leftSidebarAppearanceMode")]
    pub left_sidebar_appearance_mode: String,
    #[serde(default = "default_left_sidebar_tint_color", alias = "leftSidebarTintColor")]
    pub left_sidebar_tint_color: String,
    #[serde(default = "default_left_sidebar_tint_opacity", alias = "leftSidebarTintOpacity")]
    pub left_sidebar_tint_opacity: f32,
    #[serde(default = "default_usage_percentage_display", alias = "usagePercentageDisplay")]
    pub usage_percentage_display: String,
    #[serde(default = "default_true", alias = "statusBarClaudeUsage")]
    pub status_bar_claude_usage: bool,
    #[serde(default = "default_true", alias = "statusBarAntigravityUsage")]
    pub status_bar_antigravity_usage: bool,
    #[serde(default = "default_true", alias = "statusBarOpencodeUsage")]
    pub status_bar_opencode_usage: bool,
    #[serde(default = "default_true", alias = "statusBarMinimaxUsage")]
    pub status_bar_minimax_usage: bool,
    #[serde(default = "default_true", alias = "statusBarRemoteHosts")]
    pub status_bar_remote_hosts: bool,
    #[serde(default = "default_true", alias = "statusBarResourceManager")]
    pub status_bar_resource_manager: bool,
    #[serde(default = "default_true", alias = "statusBarPorts")]
    pub status_bar_ports: bool,
    #[serde(default = "default_cursor_opacity", alias = "terminalCursorOpacity")]
    pub terminal_cursor_opacity: f32,
    #[serde(default = "default_padding", alias = "terminalPaddingX")]
    pub terminal_padding_x: u32,
    #[serde(default = "default_padding", alias = "terminalPaddingY")]
    pub terminal_padding_y: u32,
    #[serde(default = "default_false", alias = "windowBackgroundBlur")]
    pub window_background_blur: bool,
    #[serde(default = "default_false", alias = "terminalMouseHideWhileTyping")]
    pub terminal_mouse_hide_while_typing: bool,
    // Theme-parity Orca additions (optional, keep main's required fields intact)
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "editorFontFamily")]
    pub editor_font_family: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "editorMinimapEnabled")]
    pub editor_minimap_enabled: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "editorWordWrap")]
    pub editor_word_wrap: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "terminalQuickCommands")]
    pub terminal_quick_commands: Option<Vec<serde_json::Value>>,
    #[serde(default = "default_true", alias = "terminalScopeHistoryByWorktree")]
    pub terminal_scope_history_by_worktree: bool,
    #[serde(default = "default_status_bar_items", alias = "statusBarItems")]
    pub status_bar_items: Vec<String>,
}

impl Default for HydraSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            app_font_family: default_app_font_family(),
            terminal_font_family: default_terminal_font_family(),
            terminal_font_size: default_terminal_font_size(),
            terminal_font_weight: default_terminal_font_weight(),
            terminal_font_weight_bold: default_terminal_font_weight_bold(),
            terminal_line_height: default_terminal_line_height(),
            terminal_cursor_style: default_terminal_cursor_style(),
            terminal_cursor_blink: true,
            terminal_gpu_acceleration: default_terminal_gpu(),
            terminal_ligatures: default_terminal_ligatures(),
            terminal_theme_dark: default_terminal_theme_dark(),
            terminal_theme_light: default_terminal_theme_light(),
            terminal_use_separate_light_theme: true,
            terminal_divider_color_dark: default_divider_dark(),
            terminal_divider_color_light: default_divider_light(),
            terminal_custom_themes: vec![],
            terminal_background_opacity: None,
            terminal_minimum_contrast_ratio: None,
            terminal_color_overrides: None,
            terminal_inactive_pane_opacity: default_inactive_opacity(),
            terminal_active_pane_opacity: default_active_opacity(),
            terminal_pane_opacity_transition_ms: default_transition_ms(),
            terminal_divider_thickness_px: default_divider_thickness(),
            terminal_focus_follows_mouse: false,
            terminal_scrollback_rows: default_scrollback(),
            terminal_scroll_sensitivity: default_scroll_sensitivity(),
            terminal_fast_scroll_sensitivity: default_fast_scroll_sensitivity(),
            terminal_tui_scroll_sensitivity: default_tui_scroll_sensitivity(),
            terminal_inline_images: true,
            terminal_right_click_to_paste: false,
            terminal_clipboard_on_select: true,
            terminal_copy_trims_gutter: true,
            terminal_allow_osc52_clipboard: true,
            terminal_word_separator: None,
            setup_script_launch_mode: default_setup_script_launch_mode(),
            primary_selection_middle_click_paste: true,
            auto_approve_reads: true,
            notification_on_blocked: true,
            default_branch_prefix: default_branch_prefix(),
            workspace_dir: default_workspace_dir(),
            nest_workspaces: default_nest_workspaces(),
            workspace_dir_history: vec![],
            ctrl_tab_order_mode: default_ctrl_tab_order_mode(),
            confirm_close_pinned_tab: true,
            skip_close_terminal_with_running_process_confirm: false,
            skip_delete_worktree_confirm: false,
            worktree_visibility_defaults: Some(WorktreeVisibilityDefaults {
                external: Some("hide".to_string()),
                custom_sources: Some(vec![]),
                source_preferences: Some(SourcePreferences { built_in: Some(std::collections::HashMap::new()), custom: Some(std::collections::HashMap::new()) }),
            }),
            terminal_default_shell: String::new(),
            default_tui_agent: None,
            disabled_tui_agents: vec![],
            agent_status_hooks_enabled: true,
            tab_auto_generate_title: false,
            keep_computer_awake_while_agents_run: false,
            agent_permission_mode: default_agent_perm(),
            agent_cmd_overrides: std::collections::HashMap::new(),
            agent_default_args: std::collections::HashMap::new(),
            agent_default_env: std::collections::HashMap::new(),
            open_in_applications: default_open_in_applications(),
            ui_zoom: default_ui_zoom(),
            compact_worktree_cards: false,
            left_sidebar_appearance_mode: default_left_sidebar_appearance_mode(),
            left_sidebar_tint_color: default_left_sidebar_tint_color(),
            left_sidebar_tint_opacity: default_left_sidebar_tint_opacity(),
            usage_percentage_display: default_usage_percentage_display(),
            status_bar_claude_usage: true,
            status_bar_antigravity_usage: true,
            status_bar_opencode_usage: true,
            status_bar_minimax_usage: true,
            status_bar_remote_hosts: true,
            status_bar_resource_manager: true,
            status_bar_ports: true,
            terminal_cursor_opacity: 1.0,
            terminal_padding_x: 4,
            terminal_padding_y: 4,
            window_background_blur: false,
            terminal_mouse_hide_while_typing: false,
            editor_font_family: None,
            editor_minimap_enabled: Some(true),
            editor_word_wrap: Some(true),
            terminal_quick_commands: None,
            terminal_scope_history_by_worktree: true,
            status_bar_items: default_status_bar_items(),
        }
    }
}

pub struct DatabaseManager {
    conn: Mutex<Connection>,
}

impl DatabaseManager {
    pub fn new() -> Result<Self, String> {
        let db_path = Self::get_db_path()?;
        let conn = Connection::open(&db_path).map_err(|e| format!("Error opening SQLite: {e}"))?;

        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;

             CREATE TABLE IF NOT EXISTS sessions (
                 id TEXT PRIMARY KEY,
                 project_path TEXT NOT NULL DEFAULT '',
                 title TEXT NOT NULL,
                 branch TEXT NOT NULL DEFAULT 'main',
                 agent_name TEXT NOT NULL DEFAULT 'bash',
                 executable TEXT NOT NULL DEFAULT 'bash',
                 created_at INTEGER NOT NULL,
                 updated_at INTEGER NOT NULL
             );

             CREATE TABLE IF NOT EXISTS messages (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 session_id TEXT NOT NULL,
                 role TEXT NOT NULL,
                 content TEXT NOT NULL,
                 created_at INTEGER NOT NULL,
                 FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
             );

             CREATE TABLE IF NOT EXISTS tool_approvals (
                 id TEXT PRIMARY KEY,
                 session_id TEXT NOT NULL,
                 tool_name TEXT NOT NULL,
                 command TEXT NOT NULL,
                 status TEXT NOT NULL,
                 created_at INTEGER NOT NULL
             );

             CREATE TABLE IF NOT EXISTS session_state_history (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 session_id TEXT NOT NULL,
                 state TEXT NOT NULL,
                 started_at INTEGER NOT NULL
             );

             CREATE TABLE IF NOT EXISTS settings (
                 key TEXT PRIMARY KEY,
                 value TEXT NOT NULL
             );

             CREATE TABLE IF NOT EXISTS sidebar_prefs (
                 key TEXT PRIMARY KEY,
                 json TEXT NOT NULL
             );",
        )
        .map_err(|e| format!("Error running SQLite migrations: {e}"))?;

        let _ = conn.execute("ALTER TABLE sessions ADD COLUMN project_path TEXT NOT NULL DEFAULT ''", params![]);
        let _ = conn.execute("ALTER TABLE sessions ADD COLUMN branch TEXT NOT NULL DEFAULT 'main'", params![]);
        let _ = conn.execute("ALTER TABLE sessions ADD COLUMN agent_name TEXT NOT NULL DEFAULT 'bash'", params![]);
        let _ = conn.execute("ALTER TABLE sessions ADD COLUMN executable TEXT NOT NULL DEFAULT 'bash'", params![]);

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn get_db_path() -> Result<PathBuf, String> {
        let home = std::env::var("HOME").map_err(|_| "HOME not found".to_string())?;
        let dir = PathBuf::from(home).join(".config").join("hydra");
        std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create ~/.config/hydra: {e}"))?;
        Ok(dir.join("hydra_sessions.sqlite3"))
    }

    pub fn get_layout_state(&self) -> Result<UiLayoutState, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = 'ui_layout_state'")
            .map_err(|e| format!("Error querying layout state: {e}"))?;

        let mut rows = stmt.query(params![]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let json_str: String = row.get(0).map_err(|e| e.to_string())?;
            serde_json::from_str(&json_str).map_err(|e| format!("JSON parse error: {e}"))
        } else {
            Ok(UiLayoutState::default())
        }
    }

    pub fn save_layout_state(&self, layout: &UiLayoutState) -> Result<(), String> {
        let conn = self.conn.lock();
        let json_str = serde_json::to_string(layout).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('ui_layout_state', ?1)",
            params![json_str],
        )
        .map_err(|e| format!("Error saving layout state: {e}"))?;
        Ok(())
    }

    pub fn get_workbench_state(&self) -> Result<WorkbenchState, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = 'workbench_state'")
            .map_err(|e| format!("Error querying workbench state: {e}"))?;

        let mut rows = stmt.query(params![]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let json_str: String = row.get(0).map_err(|e| e.to_string())?;
            serde_json::from_str(&json_str).map_err(|e| format!("JSON parse error: {e}"))
        } else {
            Ok(WorkbenchState::default())
        }
    }

    pub fn save_workbench_state(&self, state: &WorkbenchState) -> Result<(), String> {
        let conn = self.conn.lock();
        let json_str = serde_json::to_string(state).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('workbench_state', ?1)",
            params![json_str],
        )
        .map_err(|e| format!("Error saving workbench state: {e}"))?;
        Ok(())
    }

    pub fn get_workbench_state_for_project(&self, project_path: &str) -> Result<WorkbenchState, String> {
        let key = format!("workbench_state:{}", project_path);
        let maybe_json: Option<String> = {
            let conn = self.conn.lock();
            let mut stmt = conn
                .prepare("SELECT value FROM settings WHERE key = ?1")
                .map_err(|e| format!("Error querying workbench state: {e}"))?;
            let mut rows = stmt.query(params![key]).map_err(|e| e.to_string())?;
            if let Some(row) = rows.next().map_err(|e| e.to_string())? {
                Some(row.get(0).map_err(|e| e.to_string())?)
            } else {
                None
            }
        };
        if let Some(json_str) = maybe_json {
            serde_json::from_str(&json_str).map_err(|e| format!("JSON parse error: {e}"))
        } else {
            Ok(WorkbenchState::default())
        }
    }

    pub fn save_workbench_state_for_project(&self, project_path: &str, state: &WorkbenchState) -> Result<(), String> {
        let conn = self.conn.lock();
        let json_str = serde_json::to_string(state).map_err(|e| e.to_string())?;
        let key = format!("workbench_state:{}", project_path);
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, json_str],
        )
        .map_err(|e| format!("Error saving workbench state: {e}"))?;
        Ok(())
    }

    pub fn list_sessions(&self, project_path: Option<&str>) -> Result<Vec<DbSessionRecord>, String> {
        let conn = self.conn.lock();

        let mut list = Vec::new();
        if let Some(p) = project_path {
            if !p.is_empty() {
                let mut stmt = conn
                    .prepare("SELECT id, project_path, title, branch, agent_name, executable, created_at, updated_at FROM sessions WHERE project_path = ?1 OR project_path = '' ORDER BY updated_at DESC")
                    .map_err(|e| format!("Error preparing sessions select: {e}"))?;
                let rows = stmt
                    .query_map(params![p], |row| {
                        Ok(DbSessionRecord {
                            id: row.get(0)?,
                            project_path: row.get(1)?,
                            title: row.get(2)?,
                            branch: row.get(3)?,
                            agent_name: row.get(4)?,
                            executable: row.get(5)?,
                            created_at: row.get(6)?,
                            updated_at: row.get(7)?,
                        })
                    })
                    .map_err(|e| format!("Query error: {e}"))?;
                for r in rows.flatten() {
                    list.push(r);
                }
                return Ok(list);
            }
        }

        let mut stmt = conn
            .prepare("SELECT id, project_path, title, branch, agent_name, executable, created_at, updated_at FROM sessions ORDER BY updated_at DESC")
            .map_err(|e| format!("Error preparing sessions select: {e}"))?;
        let rows = stmt
            .query_map(params![], |row| {
                Ok(DbSessionRecord {
                    id: row.get(0)?,
                    project_path: row.get(1)?,
                    title: row.get(2)?,
                    branch: row.get(3)?,
                    agent_name: row.get(4)?,
                    executable: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })
            .map_err(|e| format!("Query error: {e}"))?;
        for r in rows.flatten() {
            list.push(r);
        }

        Ok(list)
    }

    pub fn upsert_session(&self, record: &DbSessionRecord) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO sessions (id, project_path, title, branch, agent_name, executable, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET 
             project_path = excluded.project_path,
             title = excluded.title,
             branch = excluded.branch,
             agent_name = excluded.agent_name,
             executable = excluded.executable,
             updated_at = excluded.updated_at",
            params![
                record.id,
                record.project_path,
                record.title,
                record.branch,
                record.agent_name,
                record.executable,
                record.created_at,
                record.updated_at
            ],
        )
        .map_err(|e| format!("Error upserting session: {e}"))?;
        Ok(())
    }

    pub fn delete_session(&self, session_id: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM sessions WHERE id = ?1", params![session_id])
            .map_err(|e| format!("Error deleting session: {e}"))?;
        Ok(())
    }

    pub fn save_message(&self, session_id: &str, role: &str, content: &str) -> Result<i64, String> {
        let conn = self.conn.lock();
        let now = chrono_now();

        let _ = conn.execute(
            "INSERT OR IGNORE INTO sessions (id, project_path, title, branch, agent_name, executable, created_at, updated_at) 
             VALUES (?1, '', ?2, 'main', 'bash', 'bash', ?3, ?3)",
            params![session_id, "Main Session", now],
        );

        conn.execute(
            "INSERT INTO messages (session_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![session_id, role, content, now],
        )
        .map_err(|e| format!("Error inserting message: {e}"))?;

        Ok(conn.last_insert_rowid())
    }

    pub fn list_messages(&self, session_id: &str) -> Result<Vec<ChatMessage>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT id, session_id, role, content, created_at FROM messages WHERE session_id = ?1 ORDER BY id ASC")
            .map_err(|e| format!("Error preparing select: {e}"))?;

        let rows = stmt
            .query_map(params![session_id], |row| {
                Ok(ChatMessage {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    role: row.get(2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })
            .map_err(|e| format!("Query error: {e}"))?;

        let mut messages = Vec::new();
        for r in rows {
            if let Ok(msg) = r {
                messages.push(msg);
            }
        }
        Ok(messages)
    }

    pub fn save_tool_approval(&self, approval: &ToolApprovalRecord) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT OR REPLACE INTO tool_approvals (id, session_id, tool_name, command, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                approval.id,
                approval.session_id,
                approval.tool_name,
                approval.command,
                approval.status,
                approval.created_at
            ],
        )
        .map_err(|e| format!("Error saving tool approval: {e}"))?;
        Ok(())
    }

    pub fn list_tool_approvals(&self, session_id: Option<&str>) -> Result<Vec<ToolApprovalRecord>, String> {
        let conn = self.conn.lock();
        let mut out = Vec::new();
        if let Some(sid) = session_id.filter(|s| !s.is_empty()) {
            let mut stmt = conn
                .prepare("SELECT id, session_id, tool_name, command, status, created_at FROM tool_approvals WHERE session_id = ?1 ORDER BY created_at DESC LIMIT 100")
                .map_err(|e| format!("Error preparing tool_approvals select: {e}"))?;
            let rows = stmt
                .query_map(params![sid], |row| {
                    Ok(ToolApprovalRecord {
                        id: row.get(0)?,
                        session_id: row.get(1)?,
                        tool_name: row.get(2)?,
                        command: row.get(3)?,
                        status: row.get(4)?,
                        created_at: row.get(5)?,
                    })
                })
                .map_err(|e| format!("Query error: {e}"))?;
            for r in rows.flatten() {
                out.push(r);
            }
        } else {
            let mut stmt = conn
                .prepare("SELECT id, session_id, tool_name, command, status, created_at FROM tool_approvals ORDER BY created_at DESC LIMIT 100")
                .map_err(|e| format!("Error preparing tool_approvals select: {e}"))?;
            let rows = stmt
                .query_map(params![], |row| {
                    Ok(ToolApprovalRecord {
                        id: row.get(0)?,
                        session_id: row.get(1)?,
                        tool_name: row.get(2)?,
                        command: row.get(3)?,
                        status: row.get(4)?,
                        created_at: row.get(5)?,
                    })
                })
                .map_err(|e| format!("Query error: {e}"))?;
            for r in rows.flatten() {
                out.push(r);
            }
        }
        Ok(out)
    }

    pub fn get_tool_approval(&self, id: &str) -> Result<Option<ToolApprovalRecord>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT id, session_id, tool_name, command, status, created_at FROM tool_approvals WHERE id = ?1")
            .map_err(|e| format!("Error preparing tool_approval get: {e}"))?;
        let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let rec = ToolApprovalRecord {
                id: row.get(0).map_err(|e| e.to_string())?,
                session_id: row.get(1).map_err(|e| e.to_string())?,
                tool_name: row.get(2).map_err(|e| e.to_string())?,
                command: row.get(3).map_err(|e| e.to_string())?,
                status: row.get(4).map_err(|e| e.to_string())?,
                created_at: row.get(5).map_err(|e| e.to_string())?,
            };
            Ok(Some(rec))
        } else {
            Ok(None)
        }
    }

    pub fn update_tool_approval_status(&self, id: &str, status: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        let changed = conn
            .execute("UPDATE tool_approvals SET status = ?1 WHERE id = ?2", params![status, id])
            .map_err(|e| format!("Error updating tool approval: {e}"))?;
        if changed == 0 {
            return Err(format!("No tool approval with id '{id}'"));
        }
        Ok(())
    }

    pub fn get_settings(&self) -> Result<HydraSettings, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = 'global_settings'")
            .map_err(|e| format!("Error querying settings: {e}"))?;

        let mut rows = stmt.query(params![]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let json_str: String = row.get(0).map_err(|e| e.to_string())?;
            serde_json::from_str(&json_str).map_err(|e| format!("JSON parse error: {e}"))
        } else {
            Ok(HydraSettings::default())
        }
    }

    pub fn save_settings(&self, settings: &HydraSettings) -> Result<(), String> {
        let conn = self.conn.lock();
        let json_str = serde_json::to_string(settings).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('global_settings', ?1)",
            params![json_str],
        )
        .map_err(|e| format!("Error saving settings: {e}"))?;
        Ok(())
    }

    /// Registra uma transição de estado de agente (PR-6) e mantém o histórico
    /// da sessão limitado: cap Orca AGENT_STATE_HISTORY_MAX = 20 entradas,
    /// podando as mais antigas no próprio insert.
    pub fn insert_state_transition(&self, session_id: &str, state: &str, started_at: i64) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO session_state_history (session_id, state, started_at) VALUES (?1, ?2, ?3)",
            params![session_id, state, started_at],
        )
        .map_err(|e| format!("Error inserting state transition: {e}"))?;
        conn.execute(
            "DELETE FROM session_state_history WHERE session_id = ?1 AND id NOT IN (
                SELECT id FROM session_state_history WHERE session_id = ?1 ORDER BY id DESC LIMIT 20
            )",
            params![session_id],
        )
        .map_err(|e| format!("Error pruning state history: {e}"))?;
        Ok(())
    }

    /// Histórico de estados da sessão, do mais antigo ao mais recente (ordem de
    /// inserção) — o mesmo sentido cronológico do `stateHistory` do Orca.
    pub fn get_state_history(&self, session_id: &str) -> Result<Vec<AgentStateHistoryRecord>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT state, started_at FROM session_state_history WHERE session_id = ?1 ORDER BY id ASC")
            .map_err(|e| format!("Error preparing state history select: {e}"))?;
        let rows = stmt
            .query_map(params![session_id], |row| {
                Ok(AgentStateHistoryRecord {
                    state: row.get(0)?,
                    started_at: row.get(1)?,
                })
            })
            .map_err(|e| format!("Query error: {e}"))?;
        let mut history = Vec::new();
        for r in rows.flatten() {
            history.push(r);
        }
        Ok(history)
    }

    /// PR-14: sidebar UI prefs persisted as an opaque JSON blob per key (the
    /// frontend owns the shape under "ui.sidebar"; Rust never parses it).
    pub fn save_sidebar_pref(&self, key: &str, json: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT OR REPLACE INTO sidebar_prefs (key, json) VALUES (?1, ?2)",
            params![key, json],
        )
        .map_err(|e| format!("Error saving sidebar pref: {e}"))?;
        Ok(())
    }

    pub fn get_sidebar_pref(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT json FROM sidebar_prefs WHERE key = ?1")
            .map_err(|e| format!("Error querying sidebar pref: {e}"))?;
        let mut rows = stmt.query(params![key]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let json_str: String = row.get(0).map_err(|e| e.to_string())?;
            Ok(Some(json_str))
        } else {
            Ok(None)
        }
    }

    #[cfg(test)]
    pub fn new_in_memory() -> Result<Self, String> {
        let conn = Connection::open_in_memory().map_err(|e| format!("Error opening SQLite in memory: {e}"))?;
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             CREATE TABLE IF NOT EXISTS sessions (
                 id TEXT PRIMARY KEY,
                 project_path TEXT NOT NULL DEFAULT '',
                 title TEXT NOT NULL,
                 branch TEXT NOT NULL DEFAULT 'main',
                 agent_name TEXT NOT NULL DEFAULT 'bash',
                 executable TEXT NOT NULL DEFAULT 'bash',
                 created_at INTEGER NOT NULL,
                 updated_at INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS messages (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 session_id TEXT NOT NULL,
                 role TEXT NOT NULL,
                 content TEXT NOT NULL,
                 created_at INTEGER NOT NULL,
                 FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
             );
             CREATE TABLE IF NOT EXISTS tool_approvals (
                 id TEXT PRIMARY KEY,
                 session_id TEXT NOT NULL,
                 tool_name TEXT NOT NULL,
                 command TEXT NOT NULL,
                 status TEXT NOT NULL,
                 created_at INTEGER NOT NULL,
                 FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
             );
             CREATE TABLE IF NOT EXISTS session_state_history (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 session_id TEXT NOT NULL,
                 state TEXT NOT NULL,
                 started_at INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS settings (
                 key TEXT PRIMARY KEY,
                 value TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS sidebar_prefs (
                 key TEXT PRIMARY KEY,
                 json TEXT NOT NULL
             );"
        )
        .map_err(|e| format!("Error running SQLite migrations: {e}"))?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_db_sessions_crud() {
        let db = DatabaseManager::new_in_memory().expect("in-memory db");
        let rec = DbSessionRecord {
            id: "sess_1".to_string(),
            project_path: "/home/user/repo".to_string(),
            title: "Test Session".to_string(),
            branch: "feat-test".to_string(),
            agent_name: "claude".to_string(),
            executable: "claude".to_string(),
            created_at: 1000,
            updated_at: 1000,
        };
        db.upsert_session(&rec).expect("upsert");

        let list = db.list_sessions(Some("/home/user/repo")).expect("list");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, "sess_1");
        assert_eq!(list[0].title, "Test Session");

        db.delete_session("sess_1").expect("delete");
        let list2 = db.list_sessions(Some("/home/user/repo")).expect("list after delete");
        assert_eq!(list2.len(), 0);
    }

    #[test]
    fn test_db_messages() {
        let db = DatabaseManager::new_in_memory().expect("in-memory db");
        let rec = DbSessionRecord {
            id: "sess_msg".to_string(),
            project_path: "/home/user/repo".to_string(),
            title: "Msg Session".to_string(),
            branch: "main".to_string(),
            agent_name: "bash".to_string(),
            executable: "bash".to_string(),
            created_at: 1000,
            updated_at: 1000,
        };
        db.upsert_session(&rec).expect("upsert");

        let msg_id = db.save_message("sess_msg", "user", "Hello agent").expect("save message");
        assert!(msg_id > 0);

        let msgs = db.list_messages("sess_msg").expect("list messages");
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].content, "Hello agent");
        assert_eq!(msgs[0].role, "user");
    }

    #[test]
    fn test_db_settings_and_layout() {
        let db = DatabaseManager::new_in_memory().expect("in-memory db");
        let mut settings = HydraSettings::default();
        settings.terminal_font_size = 18;
        settings.theme = "dark".to_string();
        db.save_settings(&settings).expect("save settings");

        let loaded = db.get_settings().expect("get settings");
        assert_eq!(loaded.terminal_font_size, 18);
        assert_eq!(loaded.theme, "dark");

        let layout = UiLayoutState {
            left_sidebar_open: false,
            right_sidebar_open: true,
            left_sidebar_width: 320,
            right_sidebar_width: 400,
        };
        db.save_layout_state(&layout).expect("save layout");
        let loaded_layout = db.get_layout_state().expect("get layout");
        assert_eq!(loaded_layout.left_sidebar_open, false);
        assert_eq!(loaded_layout.left_sidebar_width, 320);
    }

    #[test]
    fn test_worktree_visibility_defaults_single_canonical_keys() {
        // Bug #8: serialization must emit exactly ONE key per logical field
        // (canonical camelCase wire) — never both spellings.
        let mut built_in = std::collections::HashMap::new();
        built_in.insert("claude".to_string(), "show".to_string());
        let wvd = WorktreeVisibilityDefaults {
            external: Some("hide".to_string()),
            custom_sources: Some(vec![CustomWorktreeSource {
                id: "s1".to_string(),
                root_path: "/worktrees".to_string(),
            }]),
            source_preferences: Some(SourcePreferences {
                built_in: Some(built_in),
                custom: Some(std::collections::HashMap::new()),
            }),
        };

        let json = serde_json::to_string(&wvd).expect("serialize wvd");
        assert!(json.contains("\"customSources\""), "missing canonical key: {json}");
        assert!(!json.contains("custom_sources"), "duplicate snake key emitted: {json}");
        assert!(json.contains("\"sourcePreferences\""), "missing canonical key: {json}");
        assert!(!json.contains("source_preferences"), "duplicate snake key emitted: {json}");
        assert!(json.contains("\"rootPath\""), "missing canonical key: {json}");
        assert!(!json.contains("root_path"), "duplicate snake key emitted: {json}");
        assert!(json.contains("\"builtIn\""), "missing canonical key: {json}");
        assert!(!json.contains("built_in"), "duplicate snake key emitted: {json}");

        // Round-trip from the camelCase payload the frontend sends on save
        // (single field reads what the other spelling would have written).
        let back: WorktreeVisibilityDefaults = serde_json::from_str(&json).expect("deserialize camel");
        assert_eq!(back.external.as_deref(), Some("hide"));
        let src = back.custom_sources.as_ref().expect("custom_sources");
        assert_eq!(src.len(), 1);
        assert_eq!(src[0].id, "s1");
        assert_eq!(src[0].root_path, "/worktrees");
        assert_eq!(
            back.source_preferences.as_ref().and_then(|sp| sp.built_in.as_ref()).unwrap()["claude"],
            "show"
        );

        // Old snake_case payloads (written by the buggy version) still deserialize.
        let legacy = r#"{"external":"hide","custom_sources":[{"id":"s2","root_path":"/old"}],"source_preferences":{"built_in":{"gsd":"hide"},"custom":{}}}"#;
        let old: WorktreeVisibilityDefaults = serde_json::from_str(legacy).expect("deserialize snake");
        let old_src = old.custom_sources.as_ref().expect("old custom_sources");
        assert_eq!(old_src[0].id, "s2");
        assert_eq!(old_src[0].root_path, "/old");
        assert_eq!(
            old.source_preferences.as_ref().and_then(|sp| sp.built_in.as_ref()).unwrap()["gsd"],
            "hide"
        );

        // Mixed old payload carrying BOTH duplicate keys collapses to one value.
        let mixed = r#"{"custom_sources":[{"id":"a","root_path":"/snake"}],"customSources":[{"id":"b","rootPath":"/camel"}]}"#;
        let m: WorktreeVisibilityDefaults = serde_json::from_str(mixed).expect("deserialize mixed");
        let m_src = m.custom_sources.as_ref().expect("mixed custom_sources");
        assert!(m_src.iter().any(|s| s.id == "b"), "camel occurrence should win: {m_src:?}");
    }

    #[test]
    fn user_home_dir_prefers_env_and_default_has_no_hardcoded_home() {
        // Bug #14: when HOME is set, the helper uses it verbatim (its passwd /
        // temp-dir fallbacks apply only when HOME is absent or empty).
        if let Ok(home) = std::env::var("HOME") {
            if !home.is_empty() {
                assert_eq!(user_home_dir(), std::path::PathBuf::from(&home));
            }
        }
        // The default workspace dir must derive from the RESOLVED home
        // (env → passwd → temp), never from a hardcoded developer path that
        // would be wrong on any machine whose HOME differs (or is unset).
        let ws = default_workspace_dir();
        assert!(ws.ends_with("/src"), "workspace dir should end with /src: {ws}");
    }

    // ─── PR-6: session_state_history ─────────────────────────────────────

    #[test]
    fn test_db_state_history_insert_and_get() {
        let db = DatabaseManager::new_in_memory().expect("in-memory db");

        // Histórico vazio para sessão desconhecida
        assert!(db.get_state_history("nobody").expect("get empty").is_empty());

        // Transições em ordem cronológica, com timestamps crescentes
        db.insert_state_transition("sess_hist", "working", 1_000).expect("insert working");
        db.insert_state_transition("sess_hist", "blocked", 2_000).expect("insert blocked");
        db.insert_state_transition("sess_hist", "done", 3_000).expect("insert done");

        let hist = db.get_state_history("sess_hist").expect("get history");
        assert_eq!(hist.len(), 3);
        assert_eq!(hist[0].state, "working");
        assert_eq!(hist[0].started_at, 1_000);
        assert_eq!(hist[1].state, "blocked");
        assert_eq!(hist[1].started_at, 2_000);
        assert_eq!(hist[2].state, "done");
        assert_eq!(hist[2].started_at, 3_000);

        // O cap de 20 é POR SESSÃO: outra sessão não interfere
        db.insert_state_transition("other_sess", "idle", 4_000).expect("insert other");
        assert_eq!(db.get_state_history("sess_hist").expect("get history").len(), 3);
        let other = db.get_state_history("other_sess").expect("get other");
        assert_eq!(other.len(), 1);
        assert_eq!(other[0].state, "idle");
    }

    #[test]
    fn test_db_state_history_cap_20_per_session() {
        let db = DatabaseManager::new_in_memory().expect("in-memory db");

        // 25 transições: o cap mantém as 20 mais recentes, podando as antigas
        for i in 0..25i64 {
            db.insert_state_transition("sess_cap", "working", 1_000 + i).expect("insert");
        }

        let hist = db.get_state_history("sess_cap").expect("get history");
        assert_eq!(hist.len(), 20, "history must be capped at 20 per session");
        assert_eq!(hist[0].started_at, 1_005, "oldest surviving entry is transition 5 (started_at 1005)");
        assert_eq!(hist[19].started_at, 1_024, "newest entry is transition 24 (started_at 1024)");
        assert!(hist.iter().all(|r| r.state == "working"));

        // O limiar exato (21ª entrada) ainda poda a mais antiga
        db.insert_state_transition("sess_cap", "idle", 25_000).expect("insert 26th");
        let hist2 = db.get_state_history("sess_cap").expect("get history 2");
        assert_eq!(hist2[0].started_at, 1_006);
        assert_eq!(hist2[19].state, "idle");
        assert_eq!(hist2[19].started_at, 25_000);
    }

    #[test]
    fn test_db_state_history_session_id_is_bound_parameter() {
        let db = DatabaseManager::new_in_memory().expect("in-memory db");

        // Injection: um session_id hostil é persistido literal, nunca executado
        let evil = "x'); DROP TABLE session_state_history;--";
        db.insert_state_transition(evil, "working", 1).expect("insert evil session id");

        let hist = db.get_state_history(evil).expect("get evil history");
        assert_eq!(hist.len(), 1, "hostile session_id must persist literally");
        assert_eq!(hist[0].state, "working");

        // A tabela sobreviveu e sessões distintas continuam isoladas
        db.insert_state_transition("clean", "idle", 2).expect("insert clean");
        assert_eq!(db.get_state_history("clean").expect("get clean").len(), 1);
        assert_eq!(db.get_state_history(evil).expect("get evil").len(), 1);
    }

    // ─── PR-14: sidebar_prefs ───────────────────────────────────────────

    #[test]
    fn test_db_sidebar_prefs_roundtrip_per_key() {
        let db = DatabaseManager::new_in_memory().expect("in-memory db");

        // Chave desconhecida → None (o frontend cai no default/first-run)
        assert_eq!(db.get_sidebar_pref("ui.sidebar").expect("get missing"), None);

        // Roundtrip por chave, com isolamento entre chaves distintas
        db.save_sidebar_pref("ui.sidebar", r#"{"sidebarBody":"agents"}"#).expect("save ui.sidebar");
        db.save_sidebar_pref("ui.other", r#"{"x":1}"#).expect("save ui.other");
        assert_eq!(
            db.get_sidebar_pref("ui.sidebar").expect("get ui.sidebar").as_deref(),
            Some(r#"{"sidebarBody":"agents"}"#)
        );
        assert_eq!(
            db.get_sidebar_pref("ui.other").expect("get ui.other").as_deref(),
            Some(r#"{"x":1}"#)
        );
    }

    #[test]
    fn test_db_sidebar_prefs_overwrite() {
        let db = DatabaseManager::new_in_memory().expect("in-memory db");

        db.save_sidebar_pref("ui.sidebar", r#"{"sidebarBody":"workspaces"}"#).expect("save v1");
        db.save_sidebar_pref("ui.sidebar", r#"{"sidebarBody":"agents"}"#).expect("save v2");
        assert_eq!(
            db.get_sidebar_pref("ui.sidebar").expect("get after overwrite").as_deref(),
            Some(r#"{"sidebarBody":"agents"}"#),
            "INSERT OR REPLACE must keep exactly the latest blob per key"
        );
    }

    #[test]
    fn test_db_sidebar_prefs_key_is_bound_parameter() {
        let db = DatabaseManager::new_in_memory().expect("in-memory db");

        // Injection: uma key hostil é persistida literal, nunca executada
        let evil = "x'); DROP TABLE sidebar_prefs;--";
        db.save_sidebar_pref(evil, r#"{"evil":true}"#).expect("save evil key");
        assert_eq!(
            db.get_sidebar_pref(evil).expect("get evil key").as_deref(),
            Some(r#"{"evil":true}"#),
            "hostile key must persist literally"
        );

        // A tabela sobreviveu e chaves normais continuam funcionando
        db.save_sidebar_pref("ui.sidebar", r#"{"ok":1}"#).expect("save clean");
        assert_eq!(
            db.get_sidebar_pref("ui.sidebar").expect("get clean").as_deref(),
            Some(r#"{"ok":1}"#)
        );
    }
}

fn chrono_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

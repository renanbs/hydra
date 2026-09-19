import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import {
  X, Palette, TextCursorInput, Keyboard, FolderGit2, Shield, Check, Sliders, TerminalSquare, Search, Upload, Trash2
} from "lucide-react";
import { applyDocumentTheme } from "../lib/document-theme";
import { getSystemPrefersDark } from "../lib/terminal-theme";
import {
  getAvailableTerminalThemeOptions,
  resolveEffectiveTerminalAppearance,
  DEFAULT_TERMINAL_THEME_DARK,
  DEFAULT_TERMINAL_THEME_LIGHT,
} from "../lib/terminal-theme";
import { DEFAULT_HYDRA_SETTINGS, normalizeHydraSettings, type HydraSettings } from "../shared/settings-types";
import { normalizeTerminalCustomThemes } from "../shared/terminal-custom-themes";
import type { ITheme } from "@xterm/xterm";

// Re-export for App.tsx typing
export type { HydraSettings };

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: HydraSettings) => void;
  onLiveChange?: (settings: HydraSettings) => void;
}

function SegmentedControl({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex rounded-md border border-[#26272b] bg-[#0c0d0e] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-[11px] rounded font-medium transition ${value === opt.value ? "bg-[#1e1f24] text-white shadow-xs border border-[#2a2b30]" : "text-neutral-400 hover:text-neutral-200"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ThemePicker({
  selectedTheme,
  settings,
  query,
  onQueryChange,
  onSelect,
}: {
  selectedTheme: string;
  settings: HydraSettings;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (v: string) => void;
}) {
  const options = useMemo(() => getAvailableTerminalThemeOptions(settings), [settings.terminal_custom_themes]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, query]);

  const builtin = filtered.filter((o) => o.group === "built-in");
  const imported = filtered.filter((o) => o.group === "imported");

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search themes… (e.g. Tango, Ghostty, Tokyo Night)"
          className="w-full bg-[#0c0d0e] border border-[#26272b] rounded pl-7 pr-3 py-1.5 text-[11px] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60"
        />
      </div>
      <div className="max-h-[180px] overflow-y-auto rounded border border-[#26272b] bg-[#0c0d0e] divide-y divide-[#1a1c1f]">
        {imported.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-[#111214]">Imported ({imported.length})</div>
            {imported.map((o) => (
              <button key={o.value} onClick={() => onSelect(o.value)} className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-neutral-900 transition ${selectedTheme === o.value ? "bg-emerald-500/10 border-l-2 border-emerald-500" : "border-l-2 border-transparent"}`}>
                <span className="w-3 h-3 rounded-sm border border-white/10 shrink-0" style={{ background: (o.previewTheme as ITheme)?.background ?? "#282c34" }} />
                <span className="flex-1 text-[11px] text-neutral-200 truncate">{o.label}</span>
                {o.sourceLabel && <span className="text-[9px] px-1 py-0.5 rounded bg-neutral-800 text-neutral-400">{o.sourceLabel}</span>}
                {selectedTheme === o.value && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
              </button>
            ))}
          </div>
        )}
        <div>
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-neutral-500 bg-[#111214]">Built-in ({builtin.length})</div>
          {builtin.map((o) => (
            <button key={o.value} onClick={() => onSelect(o.value)} className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-neutral-900 transition ${selectedTheme === o.value ? "bg-emerald-500/10 border-l-2 border-emerald-500" : "border-l-2 border-transparent"}`}>
              <span className="w-3 h-3 rounded-sm border border-white/10 shrink-0" style={{ background: (o.previewTheme as ITheme)?.background ?? "#000" }} />
              <span className="flex-1 text-[11px] text-neutral-200 truncate">{o.label}</span>
              {selectedTheme === o.value && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
            </button>
          ))}
        </div>
        {filtered.length === 0 && <div className="px-3 py-6 text-center text-[11px] text-neutral-500">No themes match “{query}”</div>}
      </div>
      <div className="text-[10px] text-neutral-500">Selected: <span className="text-neutral-300 font-mono">{selectedTheme}</span></div>
    </div>
  );
}

function MiniTerminalPreview({ settings, target }: { settings: HydraSettings; target: "dark" | "light" }) {
  const sysDark = target === "dark";
  // Build effective settings overriding theme to target for preview
  const previewSettings = { ...settings, theme: target } as HydraSettings;
  const appearance = resolveEffectiveTerminalAppearance(previewSettings, sysDark ? true : false);
  const theme = appearance.theme as ITheme | null;
  if (!theme) return null;
  const ansi = [
    theme.black, theme.red, theme.green, theme.yellow, theme.blue, theme.magenta, theme.cyan, theme.white,
    theme.brightBlack, theme.brightRed, theme.brightGreen, theme.brightYellow, theme.brightBlue, theme.brightMagenta, theme.brightCyan, theme.brightWhite,
  ];
  return (
    <div className="rounded-lg border border-[#26272b] overflow-hidden">
      <div className="px-3 py-1.5 flex items-center justify-between text-[11px] border-b" style={{ background: theme.background, color: theme.foreground, borderColor: theme.background }}>
        <span className="font-medium">{target === "dark" ? "Dark Preview" : "Light Preview"} — {appearance.themeName}</span>
        <span className="text-[10px] opacity-60">divider {appearance.dividerColor}</span>
      </div>
      <div className="p-3 space-y-2" style={{ background: theme.background, color: theme.foreground, fontFamily: settings.terminal_font_family, fontSize: 11 }}>
        <div className="flex gap-1.5 flex-wrap">
          {ansi.map((c, i) => (
            <span key={i} className="w-5 h-5 rounded-sm border border-white/10" style={{ background: c ?? "#000" }} title={c ?? ""} />
          ))}
        </div>
        <div className="font-mono text-[11px] leading-relaxed">
          <div><span style={{ color: theme.green }}>$</span> hydra --help</div>
          <div className="opacity-80">Hydra ADE — Autonomous Development Environment</div>
          <div><span style={{ color: theme.cyan }}>✔</span> cargo test --workspace <span className="opacity-60">0.42s</span></div>
        </div>
        <div className="h-px w-full" style={{ background: appearance.dividerColor }} />
        <div className="text-[10px] opacity-60">font {settings.terminal_font_family} · {settings.terminal_font_size}px · weight {settings.terminal_font_weight}/{settings.terminal_font_weight_bold} · lh {settings.terminal_line_height}</div>
      </div>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose, onSaved, onLiveChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"appearance" | "input" | "shortcuts" | "security" | "git">("appearance");
  const [settings, setSettings] = useState<HydraSettings>(DEFAULT_HYDRA_SETTINGS);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [shortcutFilter, setShortcutFilter] = useState("");
  const [themeSearch, setThemeSearch] = useState("");
  const [terminalTarget, setTerminalTarget] = useState<"dark" | "light">("dark");
  const [importError, setImportError] = useState<string | null>(null);

  // Hydrate from SQLite + localStorage theme fallback
  useEffect(() => {
    if (isOpen) {
      invoke<HydraSettings>("get_settings")
        .then((s) => {
          if (s) {
            const normalized = normalizeHydraSettings(s);
            setSettings(normalized);
            // Sync terminal target to effective mode
            const sysDark = getSystemPrefersDark();
            const eff = resolveEffectiveTerminalAppearance(normalized, sysDark);
            setTerminalTarget(eff.mode);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Keep document theme live when settings.theme changes (Orca applyTheme behavior)
  // Live-apply terminal + app theme without waiting for Save (fixes preview not applying)
  const setSettingsLive = (next: HydraSettings) => {
    setSettings(next);
    onLiveChange?.(next);
    if (next.theme !== settings.theme) {
      applyDocumentTheme(next.theme);
      try { localStorage.setItem("hydra:theme", next.theme); } catch {}
    }
  };

  const handleThemeChange = (t: HydraSettings["theme"]) => {
    const next = { ...settings, theme: t };
    setSettings(next);
    applyDocumentTheme(t);
    try { localStorage.setItem("hydra:theme", t); } catch {}
    onLiveChange?.(next);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    invoke("save_settings", { settings })
      .then(() => {
        applyDocumentTheme(settings.theme);
        try { localStorage.setItem("hydra:theme", settings.theme); } catch {}
        setSavedFeedback(true);
        onSaved?.(settings);
        setTimeout(() => setSavedFeedback(false), 2000);
      })
      .catch(console.error);
  };

  const handleImportCustomTheme = async () => {
    setImportError(null);
    try {
      const picked = await dialogOpen({ multiple: false, filters: [{ name: "Theme", extensions: ["json", "yaml", "yml"] }] });
      if (!picked || typeof picked !== "string") return;
      // For now, expect JSON with {name, terminal:{background,foreground,...}}
      // Try to read via Tauri fs? Fallback to fetch via invoke read file if available
      // Minimal: ask user to paste JSON via prompt as fallback
      const raw = prompt(`Paste JSON for theme "${picked}"\nExpected: {"name":"My Theme","terminal":{"background":"#000", ...}}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const now = new Date().toISOString();
      const entry = {
        id: `manual:${(parsed.name ?? "imported").toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${Date.now()}`,
        name: parsed.name ?? "Imported Theme",
        source: "manual" as const,
        mode: (parsed.mode ?? "unknown") as "dark"|"light"|"unknown",
        terminal: parsed.terminal ?? parsed,
        importedAt: now,
      };
      const nextThemes = [...normalizeTerminalCustomThemes(settings.terminal_custom_themes), entry].slice(-200);
      setSettingsLive({ ...settings, terminal_custom_themes: nextThemes });
    } catch (e) {
      setImportError(String(e));
    }
  };

  const SHORTCUTS = [
    { action: "Command Palette", chord: "Ctrl+P", category: "Global Navigation", desc: "Quick search and command dispatcher" },
    { action: "Toggle Left Sidebar", chord: "Ctrl+B", category: "Layout", desc: "Toggle Worktree / Fleet sidebar" },
    { action: "Toggle Agent Panel", chord: "Ctrl+J", category: "Layout", desc: "Toggle active agent panel" },
    { action: "Open Settings", chord: "Ctrl+,", category: "Preferences", desc: "Open Hydra preferences hub" },
    { action: "New Terminal Tab", chord: "Ctrl+T", category: "Terminal", desc: "Spawn fresh bash PTY in active workbench" },
    { action: "Close Tab", chord: "Ctrl+W", category: "Workbench", desc: "Close focused editor or terminal tab" },
    { action: "Copy Terminal Selection", chord: "Ctrl+Shift+C", category: "Terminal", desc: "Copy highlighted text to system clipboard" },
    { action: "Paste to Terminal", chord: "Ctrl+Shift+V", category: "Terminal", desc: "Paste system clipboard into active PTY" },
    { action: "Clear Terminal Screen", chord: "Ctrl+L", category: "Terminal", desc: "Clear visible scrollback buffer" },
    { action: "Approve Tool Execution", chord: "Ctrl+Enter", category: "Agent Gate", desc: "Approve pending human-in-the-loop tool call" },
    { action: "Reject Tool Execution", chord: "Escape", category: "Agent Gate", desc: "Reject pending tool execution request" },
  ];
  const filteredShortcuts = SHORTCUTS.filter((s) => s.action.toLowerCase().includes(shortcutFilter.toLowerCase()) || s.chord.toLowerCase().includes(shortcutFilter.toLowerCase()));

  const isLightTarget = terminalTarget === "light";
  const matchDarkMode = !settings.terminal_use_separate_light_theme;
  const showCustomControls = !(isLightTarget && matchDarkMode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs select-none">
      <div className="relative w-[820px] max-w-[96vw] rounded-xl bg-[#111214] border border-[#26272b] shadow-2xl flex flex-col overflow-hidden text-xs text-neutral-300">
        <div className="h-11 border-b border-[#222] px-4 flex items-center justify-between bg-[#141518] shrink-0">
          <div className="flex items-center gap-2 font-semibold text-neutral-200">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Hydra Settings Hub — faithful Orca port</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">SQLite WAL · ~/.config/hydra/</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex h-[560px]">
          <div className="w-48 border-r border-[#222] bg-[#0e0f11] p-2 space-y-1 shrink-0 overflow-y-auto">
            <div className="px-2 py-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Interface & Desktop</div>
            <button onClick={() => setActiveTab("appearance")} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${activeTab === "appearance" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"}`}><Palette className="w-3.5 h-3.5 text-purple-400" /><span>Appearance</span></button>
            <button onClick={() => setActiveTab("input")} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${activeTab === "input" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"}`}><TextCursorInput className="w-3.5 h-3.5 text-blue-400" /><span>Input & Editing</span></button>
            <button onClick={() => setActiveTab("shortcuts")} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${activeTab === "shortcuts" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"}`}><Keyboard className="w-3.5 h-3.5 text-emerald-400" /><span>Shortcuts</span></button>
            <div className="px-2 pt-3 py-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Workflow & Engine</div>
            <button onClick={() => setActiveTab("security")} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${activeTab === "security" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"}`}><Shield className="w-3.5 h-3.5 text-amber-400" /><span>Security & Gate</span></button>
            <button onClick={() => setActiveTab("git")} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${activeTab === "git" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"}`}><FolderGit2 className="w-3.5 h-3.5 text-neutral-400" /><span>Workspace & Git</span></button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-6">
            {activeTab === "appearance" && (
              <div className="space-y-6">
                {/* Interface — faithful Orca AppearanceInterfaceSection: Theme segmented */}
                <section className="space-y-3">
                  <h4 className="font-semibold text-neutral-100 text-sm flex items-center gap-2"><Palette className="w-3.5 h-3.5 text-purple-400" />Interface</h4>
                  <p className="text-[11px] text-neutral-500">Theme follows Orca: <code className="px-1 py-0.5 rounded bg-neutral-900 border border-neutral-800">system | dark | light</code> — system respects <code>prefers-color-scheme</code>. Applied via <code>applyDocumentTheme</code> toggling <code>.dark/.light</code> on <code>&lt;html&gt;</code>.</p>
                  <div className="p-3 rounded-lg border border-[#26272b] bg-[#0e0f11] flex items-center justify-between">
                    <div>
                      <div className="font-medium text-neutral-200 text-xs">Theme</div>
                      <div className="text-[11px] text-neutral-500">Choose the app chrome theme. Terminal themes can differ per mode below.</div>
                    </div>
                    <SegmentedControl
                      value={settings.theme}
                      onChange={(v) => handleThemeChange(v as HydraSettings["theme"])}
                      options={[
                        { value: "system", label: "System" },
                        { value: "dark", label: "Dark" },
                        { value: "light", label: "Light" },
                      ]}
                    />
                  </div>
                </section>

                {/* Terminal Typography — faithful */}
                <section className="space-y-3 border-t border-[#222] pt-5">
                  <h4 className="font-semibold text-neutral-100 text-sm flex items-center gap-2"><TerminalSquare className="w-3.5 h-3.5 text-emerald-400" />Terminal — Typography</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-neutral-400 mb-1 font-medium">Font Family</label>
                      <input value={settings.terminal_font_family} onChange={(e) => setSettingsLive({ ...settings, terminal_font_family: e.target.value })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-[11px] text-neutral-200 focus:outline-none focus:border-emerald-500/60" placeholder="'JetBrains Mono', 'Fira Code', monospace" />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Font Size (px)</label>
                      <input type="number" min={8} max={32} value={settings.terminal_font_size} onChange={(e) => setSettingsLive({ ...settings, terminal_font_size: Number(e.target.value) })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-emerald-500/60" />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Line Height</label>
                      <input type="number" min={0.8} max={2} step={0.05} value={settings.terminal_line_height} onChange={(e) => setSettingsLive({ ...settings, terminal_line_height: Number(e.target.value) })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-emerald-500/60" />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Weight</label>
                      <input type="number" min={100} max={900} step={100} value={settings.terminal_font_weight} onChange={(e) => setSettingsLive({ ...settings, terminal_font_weight: Number(e.target.value) })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-emerald-500/60" />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Weight Bold</label>
                      <input type="number" min={100} max={900} step={100} value={settings.terminal_font_weight_bold} onChange={(e) => setSettingsLive({ ...settings, terminal_font_weight_bold: Number(e.target.value) })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-emerald-500/60" />
                    </div>
                  </div>
                </section>

                {/* Terminal Themes Catalog — faithful Orca TerminalThemeSections */}
                <section className="space-y-4 border-t border-[#222] pt-5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-neutral-100 text-sm">Terminal Themes</h4>
                    <div className="flex gap-2">
                      <button onClick={handleImportCustomTheme} className="px-2.5 py-1 rounded bg-neutral-900 border border-[#26272b] text-[11px] text-neutral-300 hover:bg-neutral-800 flex items-center gap-1.5"><Upload className="w-3 h-3" />Import JSON/YAML</button>
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-500">Catalog: {DEFAULT_TERMINAL_THEME_DARK} (dark) + {DEFAULT_TERMINAL_THEME_LIGHT} (light) + classic/popular. Matches Orca <code>TERMINAL_THEME_CATALOG</code> (50+ themes).</p>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400 font-medium">Target</span>
                    <SegmentedControl value={terminalTarget} onChange={(v) => setTerminalTarget(v as "dark"|"light")} options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} />
                    {isLightTarget && (
                      <label className="ml-3 flex items-center gap-2 text-[11px] text-neutral-300">
                        <input type="checkbox" checked={matchDarkMode} onChange={() => setSettingsLive({ ...settings, terminal_use_separate_light_theme: !settings.terminal_use_separate_light_theme })} className="accent-emerald-500" />
                        Match dark mode (share dark theme in light)
                      </label>
                    )}
                  </div>

                  {showCustomControls ? (
                    <div className="space-y-4">
                      <ThemePicker
                        selectedTheme={isLightTarget ? settings.terminal_theme_light : settings.terminal_theme_dark}
                        settings={settings}
                        query={themeSearch}
                        onQueryChange={setThemeSearch}
                        onSelect={(v) => setSettingsLive(isLightTarget ? { ...settings, terminal_theme_light: v } : { ...settings, terminal_theme_dark: v })}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-neutral-400 mb-1 font-medium">{isLightTarget ? "Light Divider Color" : "Dark Divider Color"}</label>
                          <div className="flex gap-2">
                            <input type="color" value={isLightTarget ? settings.terminal_divider_color_light : settings.terminal_divider_color_dark} onChange={(e) => setSettingsLive(isLightTarget ? { ...settings, terminal_divider_color_light: e.target.value } : { ...settings, terminal_divider_color_dark: e.target.value })} className="w-8 h-8 rounded border border-[#26272b] bg-transparent p-0" />
                            <input value={isLightTarget ? settings.terminal_divider_color_light : settings.terminal_divider_color_dark} onChange={(e) => setSettingsLive(isLightTarget ? { ...settings, terminal_divider_color_light: e.target.value } : { ...settings, terminal_divider_color_dark: e.target.value })} className="flex-1 bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-[11px] text-neutral-200 focus:outline-none focus:border-emerald-500/60" />
                          </div>
                          <div className="text-[10px] text-neutral-500 mt-1">Split divider line between panes ({isLightTarget ? "light" : "dark"} mode).</div>
                        </div>
                        <div className="flex items-end">
                          <div className="w-full h-8 rounded border border-[#26272b]" style={{ background: isLightTarget ? settings.terminal_divider_color_light : settings.terminal_divider_color_dark }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-500">Light mode is matching dark. Disable “Match dark mode” to pick a separate light theme/divider.</div>
                  )}

                  {importError && <div className="text-[11px] text-red-400">{importError}</div>}

                  {settings.terminal_custom_themes.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium text-neutral-300">Imported Custom Themes ({settings.terminal_custom_themes.length}/200)</div>
                      <div className="space-y-1 max-h-[120px] overflow-y-auto">
                        {normalizeTerminalCustomThemes(settings.terminal_custom_themes).map((t) => (
                          <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#0c0d0e] border border-[#26272b] text-[11px]">
                            <span className="w-3 h-3 rounded-sm border border-white/10" style={{ background: t.terminal.background }} />
                            <span className="flex-1 text-neutral-200 truncate">{t.name} <span className="text-neutral-500">({t.id})</span></span>
                            <span className="text-[10px] px-1 py-0.5 rounded bg-neutral-800 text-neutral-400">{t.source}</span>
                            <button onClick={() => setSettingsLive({ ...settings, terminal_custom_themes: settings.terminal_custom_themes.filter((x) => x.id !== t.id) })} className="p-1 hover:bg-red-500/20 rounded text-neutral-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <MiniTerminalPreview settings={settings} target={terminalTarget} />
                </section>

                {/* Advanced — cursor, GPU, ligatures, opacity etc */}
                <section className="space-y-4 border-t border-[#222] pt-5">
                  <h4 className="font-semibold text-neutral-100 text-sm">Advanced Terminal</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Cursor Style</label>
                      <select value={settings.terminal_cursor_style} onChange={(e) => setSettingsLive({ ...settings, terminal_cursor_style: e.target.value as HydraSettings["terminal_cursor_style"] })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 text-neutral-200 focus:outline-none focus:border-emerald-500/60">
                        <option value="block">Block</option>
                        <option value="underline">Underline</option>
                        <option value="bar">Bar</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 text-[11px] text-neutral-300 mb-1">
                        <input type="checkbox" checked={settings.terminal_cursor_blink} onChange={(e) => setSettingsLive({ ...settings, terminal_cursor_blink: e.target.checked })} className="accent-emerald-500" />
                        Cursor Blink
                      </label>
                      <label className="flex items-center gap-2 text-[11px] text-neutral-300">
                        <input type="checkbox" checked={settings.terminal_focus_follows_mouse} onChange={(e) => setSettingsLive({ ...settings, terminal_focus_follows_mouse: e.target.checked })} className="accent-emerald-500" />
                        Focus Follows Mouse
                      </label>
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">GPU Acceleration</label>
                      <select value={settings.terminal_gpu_acceleration} onChange={(e) => setSettingsLive({ ...settings, terminal_gpu_acceleration: e.target.value as HydraSettings["terminal_gpu_acceleration"] })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 text-neutral-200 focus:outline-none focus:border-emerald-500/60">
                        <option value="auto">Auto (WebGL)</option>
                        <option value="on">Force On</option>
                        <option value="off">Off (Canvas)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Ligatures</label>
                      <select value={settings.terminal_ligatures} onChange={(e) => setSettingsLive({ ...settings, terminal_ligatures: e.target.value as HydraSettings["terminal_ligatures"] })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 text-neutral-200 focus:outline-none focus:border-emerald-500/60">
                        <option value="auto">Auto (ligature fonts)</option>
                        <option value="on">On</option>
                        <option value="off">Off</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Scrollback Rows</label>
                      <input type="number" min={1000} max={100000} step={1000} value={settings.terminal_scrollback_rows} onChange={(e) => setSettingsLive({ ...settings, terminal_scrollback_rows: Number(e.target.value) })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-emerald-500/60" />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Divider Thickness (px)</label>
                      <input type="number" min={1} max={12} value={settings.terminal_divider_thickness_px} onChange={(e) => setSettingsLive({ ...settings, terminal_divider_thickness_px: Number(e.target.value) })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-emerald-500/60" />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Inactive Opacity</label>
                      <input type="number" min={0} max={1} step={0.05} value={settings.terminal_inactive_pane_opacity} onChange={(e) => setSettingsLive({ ...settings, terminal_inactive_pane_opacity: Number(e.target.value) })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-emerald-500/60" />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Active Opacity</label>
                      <input type="number" min={0} max={1} step={0.05} value={settings.terminal_active_pane_opacity} onChange={(e) => setSettingsLive({ ...settings, terminal_active_pane_opacity: Number(e.target.value) })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-emerald-500/60" />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Opacity Transition (ms)</label>
                      <input type="number" min={0} max={5000} value={settings.terminal_pane_opacity_transition_ms} onChange={(e) => setSettingsLive({ ...settings, terminal_pane_opacity_transition_ms: Number(e.target.value) })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-emerald-500/60" />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Background Opacity</label>
                      <input type="number" min={0} max={1} step={0.05} value={settings.terminal_background_opacity ?? 1} onChange={(e) => setSettingsLive({ ...settings, terminal_background_opacity: Number(e.target.value) })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-emerald-500/60" placeholder="1 (opaque)" />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Min Contrast Ratio</label>
                      <input type="number" min={1} max={21} step={0.5} value={settings.terminal_minimum_contrast_ratio ?? ""} onChange={(e) => setSettingsLive({ ...settings, terminal_minimum_contrast_ratio: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-emerald-500/60" placeholder="auto" />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "input" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-semibold text-neutral-100 text-sm">Selection & Editing Behavior</h4>
                  <p className="text-[11px] text-neutral-500">Clipboard, pointer interactions, and muscle memory routing.</p>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="space-y-0.5 pr-4">
                    <div className="font-medium text-neutral-200">Middle-click Paste from Selection</div>
                    <div className="text-[11px] text-neutral-500 leading-relaxed">Linux (X11/Wayland) primary selection buffer without altering clipboard.</div>
                  </div>
                  <input type="checkbox" checked={settings.primary_selection_middle_click_paste} onChange={(e) => setSettings({ ...settings, primary_selection_middle_click_paste: e.target.checked })} className="accent-emerald-500 w-4 h-4 cursor-pointer shrink-0" />
                </div>
              </div>
            )}

            {activeTab === "shortcuts" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div><h4 className="font-semibold text-neutral-100 text-sm">Keyboard Shortcuts Catalog</h4><p className="text-[11px] text-neutral-500">Native keybinding table matching Orca ADE and Herdr conventions.</p></div>
                  <input type="text" value={shortcutFilter} onChange={(e) => setShortcutFilter(e.target.value)} placeholder="Filter keybindings..." className="w-40 bg-[#0c0d0e] border border-[#26272b] rounded px-2.5 py-1 text-[11px] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60 font-sans" />
                </div>
                <div className="rounded-xl border border-neutral-800 overflow-hidden divide-y divide-neutral-800/60 bg-[#0e0f11]">
                  {filteredShortcuts.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 text-[11px] hover:bg-neutral-800/40 transition">
                      <div><div className="text-neutral-200 font-medium">{s.action}</div><div className="text-[10px] text-neutral-500">{s.desc}</div></div>
                      <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono text-[10px]">{s.chord}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-4">
                <div className="space-y-1"><h4 className="font-semibold text-neutral-100 text-sm">Human-in-the-Loop & Security Gates</h4><p className="text-[11px] text-neutral-500">Autonomous tool execution controls and alerts.</p></div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="space-y-0.5 pr-4"><div className="font-medium text-neutral-200">Auto-Approve Read-Only Tools</div><div className="text-[11px] text-neutral-500 leading-relaxed">Allows `cat`, `ls`, `grep` without confirmation. Destructive commands still gate.</div></div>
                  <input type="checkbox" checked={settings.auto_approve_reads} onChange={(e) => setSettings({ ...settings, auto_approve_reads: e.target.checked })} className="accent-emerald-500 w-4 h-4 cursor-pointer shrink-0" />
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="space-y-0.5 pr-4"><div className="font-medium text-neutral-200">Notify on Agent Blocked</div><div className="text-[11px] text-neutral-500 leading-relaxed">Desktop + companion notifications when Herdr detects BLOCKED.</div></div>
                  <input type="checkbox" checked={settings.notification_on_blocked} onChange={(e) => setSettings({ ...settings, notification_on_blocked: e.target.checked })} className="accent-emerald-500 w-4 h-4 cursor-pointer shrink-0" />
                </div>
              </div>
            )}

            {activeTab === "git" && (
              <div className="space-y-4">
                <div className="space-y-1"><h4 className="font-semibold text-neutral-100 text-sm">Repository & Worktree Management</h4><p className="text-[11px] text-neutral-500">Directory structure for multi-agent parallel branching.</p></div>
                <div><label className="block text-neutral-400 mb-1 font-medium">Default Workspaces Root</label><input type="text" value={settings.workspace_dir} onChange={(e) => setSettings({ ...settings, workspace_dir: e.target.value })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-[11px] text-neutral-200 focus:outline-none focus:border-emerald-500/60" /></div>
                <div><label className="block text-neutral-400 mb-1 font-medium">Auto-generated Branch Prefix</label><input type="text" value={settings.default_branch_prefix} onChange={(e) => setSettings({ ...settings, default_branch_prefix: e.target.value })} className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-[11px] text-neutral-200 focus:outline-none focus:border-emerald-500/60" /><span className="text-[10px] text-neutral-500">Prefix for parallel git branches (e.g. feat/, task/).</span></div>
              </div>
            )}
          </div>
        </div>

        <div className="h-11 border-t border-[#222] px-4 flex items-center justify-between bg-[#141518] shrink-0">
          <span className="text-[11px] text-neutral-500 font-mono">Persisted to SQLite WAL in ~/.config/hydra/ · oled migrated → dark</span>
          <div className="flex items-center gap-2">
            {savedFeedback && <span className="flex items-center gap-1 text-emerald-400 text-[11px]"><Check className="w-3.5 h-3.5" /><span>Saved</span></span>}
            <button onClick={handleSave} className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition shadow-xs">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

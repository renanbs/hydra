import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import {
  X, Search, ArrowLeft, AppWindow, TerminalSquare, Bot, Sliders, TextCursorInput, Keyboard, Shield, FolderGit2, Check, Upload, Trash2, Info, ChevronDown
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
import { FontAutocomplete } from "./settings/FontAutocomplete";
import { normalizeTerminalCustomThemes } from "../shared/terminal-custom-themes";
import type { ITheme } from "@xterm/xterm";

export type { HydraSettings };

// Hydra form controls (Orca SettingsFormControls faithful)
function SettingsSwitchRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: () => void; ariaLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5 pr-4">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        {description && <div className="text-[12px] leading-relaxed text-muted-foreground">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${checked ? "bg-emerald-600 border-emerald-600" : "bg-input border-transparent"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
function SegmentedControl({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border bg-muted p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-[12px] rounded-md font-medium transition ${value === opt.value ? "bg-background shadow text-foreground border" : "text-muted-foreground hover:text-foreground"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Preview
function MiniTerminalPreview({ settings, target }: { settings: HydraSettings; target: "dark" | "light" }) {
  const sysDark = target === "dark";
  const previewSettings = { ...settings, theme: target } as HydraSettings;
  const appearance = resolveEffectiveTerminalAppearance(previewSettings, sysDark ? true : false);
  const theme = appearance.theme as ITheme | null;
  if (!theme) return null;
  const ansi = [theme.black, theme.red, theme.green, theme.yellow, theme.blue, theme.magenta, theme.cyan, theme.white, theme.brightBlack, theme.brightRed, theme.brightGreen, theme.brightYellow, theme.brightBlue, theme.brightMagenta, theme.brightCyan, theme.brightWhite];
  return (
    <div className="rounded-xl border overflow-hidden bg-card">
      <div className="px-3 py-2 flex items-center justify-between text-[12px] border-b" style={{ background: theme.background, color: theme.foreground, borderColor: theme.background }}>
        <span className="font-medium">{target === "dark" ? "Dark Preview" : "Light Preview"} — {appearance.themeName}</span>
        <span className="text-[11px] opacity-60">divider {appearance.dividerColor}</span>
      </div>
      <div className="p-4 space-y-3" style={{ background: theme.background, color: theme.foreground, fontFamily: settings.terminal_font_family, fontSize: 11 }}>
        <div className="flex gap-1.5 flex-wrap">{ansi.map((c, i) => (<span key={i} className="w-5 h-5 rounded border border-white/10" style={{ background: c ?? "#000" }} />))}</div>
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

function ThemePicker({ selectedTheme, settings, query, onQueryChange, onSelect }: { selectedTheme: string; settings: HydraSettings; query: string; onQueryChange: (q: string) => void; onSelect: (v: string) => void }) {
  const options = useMemo(() => getAvailableTerminalThemeOptions(settings), [settings.terminal_custom_themes]);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return options; return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)); }, [options, query]);
  const builtin = filtered.filter((o) => o.group === "built-in");
  const imported = filtered.filter((o) => o.group === "imported");
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search themes… (e.g. Tango, Ghostty, Tokyo Night)" className="w-full bg-background border rounded-md pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="max-h-[200px] overflow-y-auto rounded-lg border bg-background divide-y">
        {imported.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-medium text-emerald-600 bg-muted/50">Imported ({imported.length})</div>
            {imported.map((o) => (
              <button key={o.value} onClick={() => onSelect(o.value)} className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted ${selectedTheme === o.value ? "bg-emerald-500/10 border-l-2 border-emerald-500" : "border-l-2 border-transparent"}`}>
                <span className="w-3.5 h-3.5 rounded border shrink-0" style={{ background: (o.previewTheme as ITheme)?.background ?? "#282c34" }} />
                <span className="flex-1 text-[13px] truncate">{o.label}</span>
                {o.sourceLabel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{o.sourceLabel}</span>}
                {selectedTheme === o.value && <Check className="size-3.5 text-emerald-600 shrink-0" />}
              </button>
            ))}
          </div>
        )}
        <div>
          <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-medium text-muted-foreground bg-muted/30">Built-in ({builtin.length})</div>
          {builtin.map((o) => (
            <button key={o.value} onClick={() => onSelect(o.value)} className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted ${selectedTheme === o.value ? "bg-emerald-500/10 border-l-2 border-emerald-500" : "border-l-2 border-transparent"}`}>
              <span className="w-3.5 h-3.5 rounded border shrink-0" style={{ background: (o.previewTheme as ITheme)?.background ?? "#000" }} />
              <span className="flex-1 text-[13px] truncate">{o.label}</span>
              {selectedTheme === o.value && <Check className="size-3.5 text-emerald-600 shrink-0" />}
            </button>
          ))}
        </div>
        {filtered.length === 0 && <div className="px-3 py-8 text-center text-sm text-muted-foreground">No themes match “{query}”</div>}
      </div>
      <div className="text-[11px] text-muted-foreground">Selected: <span className="font-mono text-foreground">{selectedTheme}</span></div>
    </div>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: HydraSettings) => void;
  onLiveChange?: (settings: HydraSettings) => void;
}

type HydraNavId = "appearance" | "agents" | "input" | "shortcuts" | "security" | "git";

export function SettingsModal({ isOpen, onClose, onSaved, onLiveChange }: SettingsModalProps) {
  const [activeId, setActiveId] = useState<HydraNavId>("appearance");
  const [settings, setSettings] = useState<HydraSettings>(DEFAULT_HYDRA_SETTINGS);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [shortcutFilter, setShortcutFilter] = useState("");
  const [themeSearch, setThemeSearch] = useState("");
  const [terminalTarget, setTerminalTarget] = useState<"dark" | "light">("dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [previewTerminalFont, setPreviewTerminalFont] = useState<string | null>(null);
  const [previewAppFont, setPreviewAppFont] = useState<string | null>(null);
  const [availableAgents, setAvailableAgents] = useState<{ id: string; label: string }[]>([]);
  const [availableShells, setAvailableShells] = useState<{ id: string; label: string; path: string }[]>([]);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const terminalFontSuggestions = ["JetBrains Mono","Fira Code","Cascadia Code","SF Mono","Menlo","Consolas","Liberation Mono","DejaVu Sans Mono","Source Code Pro","Ubuntu Mono","Hack","Iosevka","Geist Mono","Berkeley Mono","JetBrainsMono Nerd Font"];
  // Live preview for interface font (hover in FontAutocomplete)
  useEffect(() => {
    if (previewAppFont) {
      document.documentElement.style.setProperty("--app-font-family", previewAppFont);
      document.body.style.fontFamily = previewAppFont;
    } else {
      document.documentElement.style.setProperty("--app-font-family", settings.app_font_family);
      document.body.style.fontFamily = settings.app_font_family;
    }
  }, [previewAppFont, settings.app_font_family]);
  const interfaceFontSuggestions = ["Geist","Inter","SF Pro Text","Segoe UI","Roboto","Helvetica","Arial","System UI","-apple-system","BlinkMacSystemFont","Ubuntu","Cantarell","Noto Sans"];

  useEffect(() => {
    if (isOpen) {
      invoke<HydraSettings>("get_settings").then((s) => { if (s) { const n = normalizeHydraSettings(s); setSettings(n); setTerminalTarget(resolveEffectiveTerminalAppearance(n, getSystemPrefersDark()).mode); }}).catch(console.error);
      invoke<{ id: string; label: string }[]>("list_available_agents").then((a) => { if (Array.isArray(a)) setAvailableAgents(a.map((x: any) => ({ id: x.id ?? x.name ?? x, label: x.label ?? x.name ?? x}))); }).catch(()=>{});
      invoke<{ id: string; label: string; path: string }[]>("list_available_shells").then((s)=>{ if(Array.isArray(s)) setAvailableShells(s.map((x:any)=>({id:x.id, label:x.label, path:x.path}))); }).catch(()=>{});
      invoke<string>("get_app_version").then(setAppVersion).catch(()=>{});
    }
  }, [isOpen]);

  const setSettingsLive = (next: HydraSettings) => {
    setSettings(next);
    onLiveChange?.(next);
    if (next.theme !== settings.theme) { applyDocumentTheme(next.theme); try { localStorage.setItem("hydra:theme", next.theme); } catch {}}
  };
  const handleThemeChange = (t: HydraSettings["theme"]) => {
    const next = { ...settings, theme: t };
    setSettingsLive(next);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    invoke("save_settings", { settings }).then(() => {
      applyDocumentTheme(settings.theme);
      try { localStorage.setItem("hydra:theme", settings.theme); } catch {}
      setSavedFeedback(true);
      onSaved?.(settings);
      setTimeout(() => setSavedFeedback(false), 2000);
    }).catch(console.error);
  };
  const handleImportCustomTheme = async () => {
    setImportError(null);
    try {
      const picked = await dialogOpen({ multiple: false, filters: [{ name: "Theme", extensions: ["json", "yaml", "yml"] }] });
      if (!picked || typeof picked !== "string") return;
      const raw = prompt(`Paste JSON for theme "${picked}"\nExpected: {"name":"My Theme","terminal":{"background":"#000", ...}}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const now = new Date().toISOString();
      const entry = { id: `manual:${(parsed.name ?? "imported").toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${Date.now()}`, name: parsed.name ?? "Imported Theme", source: "manual" as const, mode: (parsed.mode ?? "unknown") as "dark"|"light"|"unknown", terminal: parsed.terminal ?? parsed, importedAt: now };
      const nextThemes = [...normalizeTerminalCustomThemes(settings.terminal_custom_themes), entry].slice(-200);
      setSettingsLive({ ...settings, terminal_custom_themes: nextThemes });
    } catch (e) { setImportError(String(e)); }
  };

  const isLightTarget = terminalTarget === "light";
  const matchDarkMode = !settings.terminal_use_separate_light_theme;
  const showCustomControls = !(isLightTarget && matchDarkMode);

  // Groups: Interface / Workflows
  const navGroups: { id: string; title: string; items: { id: HydraNavId; label: string; icon: any }[] }[] = [
    { id: "interface", title: "Interface", items: [
      { id: "appearance", label: "Appearance", icon: AppWindow },
      { id: "input", label: "Input", icon: TextCursorInput },
      { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
    ]},
    { id: "workflows", title: "Workflows", items: [
      { id: "agents", label: "Agents", icon: Bot },
      { id: "security", label: "Security & Gate", icon: Shield },
      { id: "git", label: "Workspace & Git", icon: FolderGit2 },
    ]},
  ];

  const filteredGroups = (() => {
    if (!searchQuery.trim()) return navGroups;
    const q = searchQuery.toLowerCase();
    return navGroups.map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q))})).filter(g => g.items.length>0);
  })();

  return (
    <div className="fixed left-0 right-0 bottom-0 top-[36px] z-50 flex flex-col bg-background border-t border-border">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar: 280px worktree-sidebar */}
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-worktree-sidebar-border bg-worktree-sidebar">
          <div className="border-b border-worktree-sidebar-border px-3 py-3">
            <button onClick={onClose} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted-foreground hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-accent-foreground transition">
              <ArrowLeft className="size-4" /> Back to app
            </button>
          </div>
          <div className="border-b border-worktree-sidebar-border px-3 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} placeholder="Search settings" className="w-full bg-background/60 border rounded-md pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-worktree-sidebar-ring" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {filteredGroups.map(group => (
              <div key={group.id} className="space-y-2">
                <p className="px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{group.title}</p>
                <div className="space-y-1">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeId === item.id;
                    return (
                      <button key={item.id} aria-current={isActive ? "page" : undefined} onClick={()=>setActiveId(item.id)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[13px] transition ${isActive ? "bg-worktree-sidebar-accent font-medium text-worktree-sidebar-accent-foreground ring-1 ring-worktree-sidebar-ring/25" : "text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-accent/60 hover:text-worktree-sidebar-foreground"}`}>
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {filteredGroups.length===0 && <p className="px-3 text-xs text-muted-foreground">No settings found for “{searchQuery}”</p>}
          </div>
          <div className="border-t border-worktree-sidebar-border px-3 py-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5"><Sliders className="size-3.5 text-emerald-500" /> Hydra Settings</div>
            <div className="font-mono text-[10px] mt-1 flex items-center justify-between">
              <span>SQLite WAL · ~/.config/hydra/</span>
              {appVersion && <span className="text-worktree-sidebar-foreground/70">v{appVersion}</span>}
            </div>
          </div>
        </aside>

        {/* Content — Orca gap-10 max-w-4xl */}
        <div className="flex min-h-0 flex-1 flex-col bg-background">
          <div className="flex items-center justify-between border-b px-8 py-4">
            <h2 className="text-[15px] font-semibold flex items-center gap-2">
              {activeId==="appearance" && <><AppWindow className="size-4 text-purple-500" /> Appearance</>}
              {activeId==="agents" && <><Bot className="size-4 text-emerald-500" /> Agents</>}
              {activeId==="input" && <><TextCursorInput className="size-4 text-blue-500" /> Input</>}
              {activeId==="shortcuts" && <><Keyboard className="size-4 text-amber-500" /> Shortcuts</>}
              {activeId==="security" && <><Shield className="size-4 text-red-500" /> Security & Gate</>}
              {activeId==="git" && <><FolderGit2 className="size-4" /> Workspace & Git</>}
            </h2>
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground"><X className="size-4" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-8 py-8 pb-24">
              {activeId==="appearance" && (
                <div className="space-y-8">
                  {/* Interface */}
                  <section className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-[13px] font-semibold">Interface</h3>
                      <p className="text-[12px] text-muted-foreground">Theme: <code className="px-1 py-0.5 rounded bg-muted border text-[11px]">system | dark | light</code> — system respects <code>prefers-color-scheme</code>.</p>
                    </div>
                    <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
                      <div><div className="text-[13px] font-medium">Theme</div><div className="text-[12px] text-muted-foreground">App chrome theme. Terminal can differ per mode below.</div></div>
                      <SegmentedControl value={settings.theme} onChange={(v)=>handleThemeChange(v as HydraSettings["theme"])} options={[{value:"system",label:"System"},{value:"dark",label:"Dark"},{value:"light",label:"Light"}]} />
                    </div>
                    <div className="rounded-xl border bg-card p-4 space-y-2">
                      <div className="text-[13px] font-medium">IDE Font</div>
                      <p className="text-[12px] text-muted-foreground">Interface typeface for sidebar, titlebar and panels. Preview updates live.</p>
                      <FontAutocomplete
                        value={previewAppFont ?? settings.app_font_family}
                        suggestions={interfaceFontSuggestions}
                        placeholder="Geist"
                        onPreviewFontFamily={setPreviewAppFont}
                        onChange={(v)=>{ const next = { ...settings, app_font_family: v.trim() || "Geist, sans-serif" }; setSettingsLive(next); document.documentElement.style.setProperty("--app-font-family", next.app_font_family); }}
                      />
                      <div className="text-[11px] text-muted-foreground" style={{ fontFamily: previewAppFont ?? settings.app_font_family }}>Preview: The quick brown fox jumps over the lazy dog — 1234567890</div>
                    </div>
                  </section>

                  {/* Terminal Typography */}
                  <section className="space-y-4">
                    <h3 className="text-[13px] font-semibold flex items-center gap-2"><TerminalSquare className="size-4 text-emerald-500" /> Terminal — Typography</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-[12px] font-medium mb-1.5">Font Family</label>
                        <FontAutocomplete
                          value={previewTerminalFont ?? settings.terminal_font_family}
                          suggestions={terminalFontSuggestions}
                          placeholder="JetBrains Mono"
                          onPreviewFontFamily={setPreviewTerminalFont}
                          onChange={(v)=>setSettingsLive({ ...settings, terminal_font_family: v })}
                        />
                        <div className="text-[11px] text-muted-foreground mt-1 font-mono" style={{ fontFamily: previewTerminalFont ?? settings.terminal_font_family }}>Preview: hydra --help — 0123456789 — ligatures fi fl</div>
                      </div>
                      <div><label className="block text-[12px] font-medium mb-1.5">Font Size (px)</label><input type="number" min={8} max={32} value={settings.terminal_font_size} onChange={(e)=>setSettingsLive({ ...settings, terminal_font_size: Number(e.target.value) })} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                      <div><label className="block text-[12px] font-medium mb-1.5">Line Height</label><input type="number" min={0.8} max={2} step={0.05} value={settings.terminal_line_height} onChange={(e)=>setSettingsLive({ ...settings, terminal_line_height: Number(e.target.value) })} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                      <div><label className="block text-[12px] font-medium mb-1.5">Weight</label><input type="number" min={100} max={900} step={100} value={settings.terminal_font_weight} onChange={(e)=>setSettingsLive({ ...settings, terminal_font_weight: Number(e.target.value) })} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                      <div><label className="block text-[12px] font-medium mb-1.5">Weight Bold</label><input type="number" min={100} max={900} step={100} value={settings.terminal_font_weight_bold} onChange={(e)=>setSettingsLive({ ...settings, terminal_font_weight_bold: Number(e.target.value) })} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                    </div>
                  </section>

                  {/* Terminal Themes */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[13px] font-semibold">Terminal Themes</h3>
                      <button onClick={handleImportCustomTheme} className="px-3 py-1.5 rounded-md border bg-background text-[12px] hover:bg-muted flex items-center gap-1.5"><Upload className="size-3.5" /> Import JSON/YAML</button>
                    </div>
                    <p className="text-[12px] text-muted-foreground">Catalog: {DEFAULT_TERMINAL_THEME_DARK} (dark) + {DEFAULT_TERMINAL_THEME_LIGHT} (light) + classic/popular — {getAvailableTerminalThemeOptions(settings).length} themes.</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-medium">Target</span>
                      <SegmentedControl value={terminalTarget} onChange={(v)=>setTerminalTarget(v as "dark"|"light")} options={[{value:"dark",label:"Dark"},{value:"light",label:"Light"}]} />
                      {isLightTarget && <label className="ml-2 flex items-center gap-2 text-[12px]"><input type="checkbox" checked={matchDarkMode} onChange={()=>setSettingsLive({ ...settings, terminal_use_separate_light_theme: !settings.terminal_use_separate_light_theme })} className="accent-emerald-600" /> Match dark mode</label>}
                    </div>
                    {showCustomControls ? (
                      <div className="space-y-4">
                        <ThemePicker selectedTheme={isLightTarget ? settings.terminal_theme_light : settings.terminal_theme_dark} settings={settings} query={themeSearch} onQueryChange={setThemeSearch} onSelect={(v)=>setSettingsLive(isLightTarget ? { ...settings, terminal_theme_light: v } : { ...settings, terminal_theme_dark: v })} />
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[12px] font-medium mb-1.5">{isLightTarget ? "Light Divider Color" : "Dark Divider Color"}</label>
                            <div className="flex gap-2">
                              <input type="color" value={isLightTarget ? settings.terminal_divider_color_light : settings.terminal_divider_color_dark} onChange={(e)=>setSettingsLive(isLightTarget ? { ...settings, terminal_divider_color_light: e.target.value } : { ...settings, terminal_divider_color_dark: e.target.value })} className="h-9 w-9 rounded border p-1" />
                              <input value={isLightTarget ? settings.terminal_divider_color_light : settings.terminal_divider_color_dark} onChange={(e)=>setSettingsLive(isLightTarget ? { ...settings, terminal_divider_color_light: e.target.value } : { ...settings, terminal_divider_color_dark: e.target.value })} className="flex-1 bg-background border rounded-md px-3 py-2 font-mono text-[12px]" />
                            </div>
                          </div>
                          <div className="flex items-end"><div className="w-full h-9 rounded border" style={{ background: isLightTarget ? settings.terminal_divider_color_light : settings.terminal_divider_color_dark }} /></div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-muted/30 p-3 text-[12px] text-muted-foreground">Light mode is matching dark. Disable “Match dark mode” to pick a separate light theme/divider.</div>
                    )}
                    {importError && <div className="text-[12px] text-destructive">{importError}</div>}
                    {settings.terminal_custom_themes.length>0 && (
                      <div className="space-y-2">
                        <div className="text-[12px] font-medium">Imported Custom Themes ({settings.terminal_custom_themes.length}/200)</div>
                        <div className="space-y-1 max-h-[140px] overflow-y-auto">
                          {normalizeTerminalCustomThemes(settings.terminal_custom_themes).map((t)=>(
                            <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background text-[12px]">
                              <span className="w-3.5 h-3.5 rounded border" style={{ background: t.terminal.background }} />
                              <span className="flex-1 truncate">{t.name} <span className="text-muted-foreground">({t.id})</span></span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{t.source}</span>
                              <button onClick={()=>setSettingsLive({ ...settings, terminal_custom_themes: settings.terminal_custom_themes.filter((x)=>x.id!==t.id) })} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <MiniTerminalPreview settings={previewTerminalFont ? { ...settings, terminal_font_family: previewTerminalFont } : settings} target={terminalTarget} />
                  </section>

                  {/* Default Shell — Hydra shell_detection.rs faithful */}
                  <section className="rounded-xl border bg-card p-4 space-y-3">
                    <h3 className="text-[13px] font-medium">Default Shell</h3>
                    <p className="text-[12px] text-muted-foreground">Which shell Hydra launches for new terminals. Empty = system default (<code>bash</code>). Detected via <code>which</code> + <code>/etc/shells</code> — like Orca terminalDefaultShell.</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select value={settings.terminal_default_shell} onChange={(e)=>setSettingsLive({ ...settings, terminal_default_shell: e.target.value })} className="w-full appearance-none bg-background text-foreground border border-input rounded-md pl-3 pr-8 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring">
                          <option value="">System default (bash)</option>
                          {availableShells.map(s=> <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                      <button onClick={()=>invoke<{id:string;label:string;path:string}[]>("list_available_shells").then((s:any)=>setAvailableShells(s.map((x:any)=>({id:x.id,label:x.label,path:x.path})))).catch(()=>{})} className="px-3 py-2 rounded-md border bg-background text-[12px] hover:bg-muted">Refresh</button>
                    </div>
                    <div className="flex gap-2">
                      <input value={settings.terminal_default_shell} onChange={(e)=>setSettingsLive({ ...settings, terminal_default_shell: e.target.value })} placeholder="Custom shell (e.g. /usr/bin/zsh)" className="flex-1 bg-background border border-input rounded-md px-3 py-2 font-mono text-[12px] focus:outline-none focus:ring-2 focus:ring-ring" />
                      <span className="text-[11px] text-muted-foreground self-center">Current: {settings.terminal_default_shell || "bash"} · {availableShells.length} found</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">Applies to new terminals/tabs. Existing PTYs keep their original shell until recreated.</div>
                  </section>

                  {/* Advanced */}
                  <section className="space-y-4">
                    <h3 className="text-[13px] font-semibold">Advanced Terminal</h3>
                    <div className="rounded-xl border bg-card divide-y">
                      <div className="p-4 grid grid-cols-3 gap-4">
                        <div><label className="block text-[12px] font-medium mb-1.5">Cursor Style</label><div className="relative"><select value={settings.terminal_cursor_style} onChange={(e)=>setSettingsLive({ ...settings, terminal_cursor_style: e.target.value as any })} className="w-full appearance-none bg-background text-foreground border border-input rounded-md pl-3 pr-8 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"><option value="block">Block</option><option value="underline">Underline</option><option value="bar">Bar</option></select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /></div></div>
                        <div className="space-y-2 pt-6"><label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={settings.terminal_cursor_blink} onChange={(e)=>setSettingsLive({ ...settings, terminal_cursor_blink: e.target.checked })} /> Cursor Blink</label><label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={settings.terminal_focus_follows_mouse} onChange={(e)=>setSettingsLive({ ...settings, terminal_focus_follows_mouse: e.target.checked })} /> Focus Follows Mouse</label></div>
                        <div><label className="block text-[12px] font-medium mb-1.5">GPU Acceleration</label><div className="relative"><select value={settings.terminal_gpu_acceleration} onChange={(e)=>setSettingsLive({ ...settings, terminal_gpu_acceleration: e.target.value as any })} className="w-full appearance-none bg-background text-foreground border border-input rounded-md pl-3 pr-8 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"><option value="auto">Auto</option><option value="on">On</option><option value="off">Off</option></select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /></div></div>
                        <div><label className="block text-[12px] font-medium mb-1.5">Ligatures</label><div className="relative"><select value={settings.terminal_ligatures} onChange={(e)=>setSettingsLive({ ...settings, terminal_ligatures: e.target.value as any })} className="w-full appearance-none bg-background text-foreground border border-input rounded-md pl-3 pr-8 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"><option value="auto">Auto</option><option value="on">On</option><option value="off">Off</option></select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /></div></div>
                        <div><label className="block text-[12px] font-medium mb-1.5">Scrollback Rows</label><input type="number" value={settings.terminal_scrollback_rows} onChange={(e)=>setSettingsLive({ ...settings, terminal_scrollback_rows: Number(e.target.value) })} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                        <div><label className="block text-[12px] font-medium mb-1.5">Divider Thickness (px)</label><input type="number" min={1} max={12} value={settings.terminal_divider_thickness_px} onChange={(e)=>setSettingsLive({ ...settings, terminal_divider_thickness_px: Number(e.target.value) })} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                      </div>
                      <div className="p-4 grid grid-cols-3 gap-4">
                        <div><label className="block text-[12px] font-medium mb-1.5">Inactive Opacity</label><input type="number" min={0} max={1} step={0.05} value={settings.terminal_inactive_pane_opacity} onChange={(e)=>setSettingsLive({ ...settings, terminal_inactive_pane_opacity: Number(e.target.value) })} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                        <div><label className="block text-[12px] font-medium mb-1.5">Active Opacity</label><input type="number" min={0} max={1} step={0.05} value={settings.terminal_active_pane_opacity} onChange={(e)=>setSettingsLive({ ...settings, terminal_active_pane_opacity: Number(e.target.value) })} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                        <div><label className="block text-[12px] font-medium mb-1.5">Opacity Transition (ms)</label><input type="number" value={settings.terminal_pane_opacity_transition_ms} onChange={(e)=>setSettingsLive({ ...settings, terminal_pane_opacity_transition_ms: Number(e.target.value) })} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                        <div><label className="block text-[12px] font-medium mb-1.5">Background Opacity</label><input type="number" min={0} max={1} step={0.05} value={settings.terminal_background_opacity ?? 1} onChange={(e)=>setSettingsLive({ ...settings, terminal_background_opacity: Number(e.target.value) })} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                        <div><label className="block text-[12px] font-medium mb-1.5">Min Contrast Ratio</label><input type="number" min={1} max={21} step={0.5} value={settings.terminal_minimum_contrast_ratio ?? ""} onChange={(e)=>setSettingsLive({ ...settings, terminal_minimum_contrast_ratio: e.target.value==="" ? undefined : Number(e.target.value) })} placeholder="auto" className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeId==="agents" && (
                <div className="space-y-8">
                  <div className="space-y-1">
                    <h3 className="text-[15px] font-semibold flex items-center gap-2"><Bot className="size-4 text-emerald-500" /> Agents</h3>
                    <p className="text-[12px] text-muted-foreground">Default agent, runtime, hooks and detection.</p>
                  </div>

                  {/* Default Agent */}
                  <section className="rounded-xl border bg-card p-4 space-y-3">
                    <h4 className="text-[13px] font-medium">Default Agent</h4>
                    <p className="text-[12px] text-muted-foreground">Pinned agent for new workspaces (“Auto” = first detected). “Blank” leaves terminal empty.</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1"><select value={String((settings as any).default_tui_agent ?? "auto")} onChange={(e)=>{ const v=e.target.value; const agent = v==="auto" ? null : v==="blank" ? "blank" : v; setSettingsLive({ ...settings, default_tui_agent: agent as any }); }} className="w-full appearance-none bg-background text-foreground border border-input rounded-md pl-3 pr-8 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring">
                        <option value="auto">Auto (first detected)</option>
                        <option value="blank">Blank terminal</option>
                        {availableAgents.map(a=> <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /></div>
                    </div>
                    <div className="text-[11px] text-muted-foreground">Detected: {availableAgents.map(a=>a.label).join(", ") || "none (launch Hydra to detect PATH)"}</div>
                  </section>

                  {/* Runtime */}
                  <section className="rounded-xl border bg-card">
                    <div className="p-4 space-y-3">
                      <h4 className="text-[13px] font-medium">Agent Runtime</h4>
                      <p className="text-[12px] text-muted-foreground">Host execution target for agent shells.</p>
                      <SettingsSwitchRow label="Keep computer awake while agents run" description="Requests local awake assertions while hook-reported agents are working." checked={Boolean((settings as any).keep_computer_awake_while_agents_run)} onChange={()=>setSettingsLive({ ...settings, keep_computer_awake_while_agents_run: !(settings as any).keep_computer_awake_while_agents_run } as any)} />
                    </div>
                  </section>

                  {/* Status Hooks */}
                  <section className="rounded-xl border bg-card p-4">
                    <SettingsSwitchRow label="Agent Status Hooks" description="Allows Hydra to install shell hooks that report agent status for Herdr state detection (working/blocked/idle)." checked={(settings as any).agent_status_hooks_enabled !== false} onChange={()=>setSettingsLive({ ...settings, agent_status_hooks_enabled: (settings as any).agent_status_hooks_enabled === false } as any)} />
                  </section>

                  {/* Generated Tab Titles */}
                  <section className="rounded-xl border bg-card p-4">
                    <SettingsSwitchRow label="Auto-generate tab titles" description="Generated titles are subjective, so they stay opt-in and manual renames win." checked={Boolean((settings as any).tab_auto_generate_title)} onChange={()=>setSettingsLive({ ...settings, tab_auto_generate_title: !(settings as any).tab_auto_generate_title } as any)} />
                  </section>

                  {/* Awake / Cache not shown, simplified */}

                  {/* Permissions */}
                  <section className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div><div className="text-[13px] font-medium flex items-center gap-2">Agent Permissions <Info className="size-3.5 text-muted-foreground" /></div><div className="text-[12px] text-muted-foreground">Yolo vs Manual — does not apply where launch args are overridden.</div></div>
                      <SegmentedControl value={(settings as any).agent_permission_mode ?? "yolo"} onChange={(v)=>setSettingsLive({ ...settings, agent_permission_mode: v } as any)} options={[{value:"yolo",label:"Yolo"},{value:"manual",label:"Manual"}]} />
                    </div>
                  </section>

                  {/* Detection Catalog */}
                  <section className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[13px] font-medium">Detected Agents</h4>
                      <button onClick={()=>invoke("list_available_agents").then((a:any)=>setAvailableAgents(a.map((x:any)=>({id:x.id??x.name??x, label:x.label??x.name??x})))).catch(()=>{})} className="text-[12px] px-2.5 py-1 rounded-md border hover:bg-muted">Refresh</button>
                    </div>
                    {availableAgents.length===0 ? (
                      <div className="rounded-lg border-dashed border p-6 text-center text-[13px] text-muted-foreground">No agents detected. Add to PATH (opencode, claude, codex, cursor, gemini, etc) and refresh.</div>
                    ) : (
                      <div className="divide-y rounded-lg border">
                        {availableAgents.map(agent=>{
                          const disabled = Array.isArray((settings as any).disabled_tui_agents) && (settings as any).disabled_tui_agents.includes(agent.id);
                          const isEnabled = !disabled;
                          const isExpanded = expandedAgent === agent.id;
                          const cmdOverride = (settings as any).agent_cmd_overrides?.[agent.id] ?? "";
                          const argsOverride = (settings as any).agent_default_args?.[agent.id] ?? "";
                          const envMap = (settings as any).agent_default_env?.[agent.id] ?? {};
                          const envString = Object.entries(envMap).map(([k,v])=>`${k}=${v}`).join(" ");
                          return (
                            <div key={agent.id} className="bg-card">
                              <div className="flex items-center gap-2 px-3 py-2.5">
                                <div className="flex-1 min-w-0"><div className="text-[13px] font-medium truncate">{agent.label}</div><div className="text-[11px] font-mono text-muted-foreground truncate">{agent.id}</div></div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${isEnabled ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{isEnabled ? "enabled" : "disabled"}</span>
                                <button onClick={()=>{ const cur = new Set((settings as any).disabled_tui_agents ?? []); if (isEnabled) cur.add(agent.id); else cur.delete(agent.id); setSettingsLive({ ...settings, disabled_tui_agents: Array.from(cur) } as any); }} className="text-[11px] px-2 py-1 rounded-md border bg-background hover:bg-muted">{isEnabled ? "Disable" : "Enable"}</button>
                                <button onClick={()=>setSettingsLive({ ...settings, default_tui_agent: agent.id } as any)} className={`text-[11px] px-2 py-1 rounded-md ${ (settings as any).default_tui_agent===agent.id ? "bg-emerald-600 text-white" : "border bg-background hover:bg-muted"}`}>{(settings as any).default_tui_agent===agent.id ? "Default" : "Make default"}</button>
                                <button onClick={()=>setExpandedAgent(isExpanded ? null : agent.id)} className="size-7 grid place-items-center rounded-md border bg-background hover:bg-muted"><ChevronDown className={`size-3.5 transition ${isExpanded ? "rotate-180" : ""}`} /></button>
                              </div>
                              {isExpanded && (
                                <div className="border-t bg-muted/20 p-3 space-y-3">
                                  <div>
                                    <label className="block text-[11px] font-medium mb-1">Command Override <span className="font-normal text-muted-foreground">(binary path — empty = catalog default)</span></label>
                                    <input value={cmdOverride} onChange={(e)=>{ const next = { ...((settings as any).agent_cmd_overrides ?? {}) }; if (e.target.value) next[agent.id]=e.target.value; else delete next[agent.id]; setSettingsLive({ ...settings, agent_cmd_overrides: next } as any); }} placeholder={agent.id} className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 font-mono text-[12px] focus:outline-none focus:ring-2 focus:ring-ring" />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-medium mb-1">Default Args <span className="font-normal text-muted-foreground">(appended after binary — e.g. --yolo)</span></label>
                                    <input value={argsOverride} onChange={(e)=>{ const next = { ...((settings as any).agent_default_args ?? {}) }; next[agent.id]=e.target.value; if (!e.target.value) delete next[agent.id]; setSettingsLive({ ...settings, agent_default_args: next } as any); }} placeholder="--help" className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 font-mono text-[12px] focus:outline-none focus:ring-2 focus:ring-ring" />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-medium mb-1">Default Env <span className="font-normal text-muted-foreground">(space-separated KEY=VALUE)</span></label>
                                    <input value={envString} onChange={(e)=>{ const str=e.target.value; const map: Record<string,string>={}; str.split(/\s+/).forEach(pair=>{ const [k,...rest]=pair.split("="); if(k && rest.length) map[k]=rest.join("="); }); const next = { ...((settings as any).agent_default_env ?? {}) }; if (Object.keys(map).length) next[agent.id]=map; else delete next[agent.id]; setSettingsLive({ ...settings, agent_default_env: next } as any); }} placeholder="FOO=bar BAZ=qux" className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 font-mono text-[12px] focus:outline-none focus:ring-2 focus:ring-ring" />
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">Per-agent launch defaults — empty keeps catalog default.</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {activeId==="input" && (
                <div className="space-y-6">
                  <h3 className="text-[13px] font-semibold">Input & Editing</h3>
                  <div className="rounded-xl border bg-card p-4">
                    <SettingsSwitchRow label="Middle-click Paste from Selection" description="Linux (X11/Wayland) primary selection buffer without altering clipboard." checked={settings.primary_selection_middle_click_paste} onChange={()=>setSettingsLive({ ...settings, primary_selection_middle_click_paste: !settings.primary_selection_middle_click_paste })} />
                  </div>
                </div>
              )}

              {activeId==="shortcuts" && (
                <div className="space-y-4">
                  <h3 className="text-[13px] font-semibold">Shortcuts</h3>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input value={shortcutFilter} onChange={(e)=>setShortcutFilter(e.target.value)} placeholder="Filter keybindings..." className="w-full bg-background border rounded-md pl-9 pr-3 py-2 text-[13px]" />
                  </div>
                  <div className="rounded-xl border divide-y max-h-[420px] overflow-y-auto">
                    {[
                      { action: "Command Palette", chord: "Ctrl+P", desc: "Quick search and command dispatcher" },
                      { action: "Toggle Left Sidebar", chord: "Ctrl+B", desc: "Toggle Worktree / Fleet sidebar" },
                      { action: "Toggle Agent Panel", chord: "Ctrl+J", desc: "Toggle active agent panel" },
                      { action: "Open Settings", chord: "Ctrl+,", desc: "Open Hydra preferences hub" },
                      { action: "New Terminal Tab", chord: "Ctrl+T", desc: "Spawn fresh bash PTY in active workbench" },
                      { action: "Close Tab", chord: "Ctrl+W", desc: "Close focused editor or terminal tab" },
                      { action: "Copy Terminal Selection", chord: "Ctrl+Shift+C", desc: "Copy highlighted text to system clipboard" },
                      { action: "Paste to Terminal", chord: "Ctrl+Shift+V", desc: "Paste system clipboard into active PTY" },
                      { action: "Clear Terminal Screen", chord: "Ctrl+L", desc: "Clear visible scrollback buffer" },
                      { action: "Approve Tool Execution", chord: "Ctrl+Enter", desc: "Approve pending human-in-the-loop tool call" },
                      { action: "Reject Tool Execution", chord: "Escape", desc: "Reject pending tool execution request" },
                    ].filter(s=> s.action.toLowerCase().includes(shortcutFilter.toLowerCase()) || s.chord.toLowerCase().includes(shortcutFilter.toLowerCase())).map((s,idx)=>(
                      <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50">
                        <div><div className="text-[13px] font-medium">{s.action}</div><div className="text-[11px] text-muted-foreground">{s.desc}</div></div>
                        <span className="px-2 py-1 rounded bg-muted border font-mono text-[11px]">{s.chord}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeId==="security" && (
                <div className="space-y-6">
                  <h3 className="text-[13px] font-semibold">Security & Gate</h3>
                  <div className="rounded-xl border bg-card divide-y">
                    <div className="p-4"><SettingsSwitchRow label="Auto-Approve Read-Only Tools" description="Allows cat, ls, grep without confirmation. Destructive commands still gate." checked={settings.auto_approve_reads} onChange={()=>setSettingsLive({ ...settings, auto_approve_reads: !settings.auto_approve_reads })} /></div>
                    <div className="p-4"><SettingsSwitchRow label="Notify on Agent Blocked" description="Desktop + companion notifications when Herdr detects BLOCKED." checked={settings.notification_on_blocked} onChange={()=>setSettingsLive({ ...settings, notification_on_blocked: !settings.notification_on_blocked })} /></div>
                  </div>
                </div>
              )}

              {activeId==="git" && (
                <div className="space-y-6">
                  <h3 className="text-[13px] font-semibold">Workspace & Git</h3>
                  <div className="space-y-4">
                    <div><label className="block text-[12px] font-medium mb-1.5">Default Workspaces Root</label><input value={settings.workspace_dir} onChange={(e)=>setSettingsLive({ ...settings, workspace_dir: e.target.value })} className="w-full bg-background border rounded-md px-3 py-2 font-mono text-[13px]" /></div>
                    <div><label className="block text-[12px] font-medium mb-1.5">Auto-generated Branch Prefix</label><input value={settings.default_branch_prefix} onChange={(e)=>setSettingsLive({ ...settings, default_branch_prefix: e.target.value })} className="w-full bg-background border rounded-md px-3 py-2 font-mono text-[13px]" /><span className="text-[11px] text-muted-foreground">Prefix for parallel git branches (e.g. feat/, task/).</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="border-t px-8 py-3 flex items-center justify-between bg-muted/30">
            <span className="text-[11px] font-mono text-muted-foreground">{appVersion ? `Hydra v${appVersion} · ` : ""}SQLite WAL · ~/.config/hydra/ · oled→dark migrated</span>
            <div className="flex items-center gap-2">
              {savedFeedback && <span className="flex items-center gap-1 text-emerald-600 text-[12px]"><Check className="size-3.5" /> Saved</span>}
              <button onClick={handleSave} className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-medium">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import {
  X, Search, ArrowLeft, AppWindow, TerminalSquare, Bot, Sliders, TextCursorInput, Keyboard, Shield, FolderGit2, Check, Upload, Trash2, Info, ChevronDown, ChevronRight, RotateCcw, Minus, Plus, Palette, PanelLeft
} from "lucide-react";
import { getOpenInAppPresets, isOpenInAppPresetAdded, OpenInApplicationIcon } from "../lib/open-in-app-catalog";
import type { OpenInApplication } from "../shared/settings-types";
import { DEFAULT_OPEN_IN_APPLICATIONS } from "../shared/settings-types";
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
import { resolveLeftSidebarStyleVariables } from "../lib/left-sidebar-appearance";
import type { ITheme } from "@xterm/xterm";
import type { TerminalColorOverrides } from "../shared/terminal-color-overrides";

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

function SettingsNumberRow({
  label,
  description,
  defaultValue,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  description?: string;
  defaultValue?: number | string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (val: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);
  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n)) {
      const clamped = min !== undefined && max !== undefined ? Math.min(max, Math.max(min, n)) : min !== undefined ? Math.max(min, n) : n;
      onChange(clamped);
      setDraft(String(clamped));
    } else {
      setDraft(String(value));
    }
  };
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="space-y-0.5 pr-4">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        {(description || defaultValue !== undefined) && (
          <div className="text-[12px] leading-relaxed text-muted-foreground">
            {description}
            {defaultValue !== undefined && (
              <span className="text-muted-foreground/60">
                {description ? " · " : ""}Default: {defaultValue}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
          className="w-24 bg-background text-foreground border border-input rounded-md px-3 py-1.5 text-[13px] font-mono tabular-nums text-right focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {suffix && <span className="text-[12px] text-muted-foreground w-8 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function ColorOverridesSection({
  settings,
  onChange,
}: {
  settings: HydraSettings;
  onChange: (overrides: TerminalColorOverrides | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = settings.terminal_color_overrides ?? {};
  type ColorKey = keyof TerminalColorOverrides;

  const updateColor = (key: ColorKey, val: string) => {
    const next = { ...current, [key]: val || undefined };
    onChange(next);
  };

  const clearAll = () => {
    onChange(undefined);
  };

  const hasAny = Object.values(current).some(Boolean);

  const baseColors: { key: ColorKey; label: string; def: string }[] = [
    { key: "foreground", label: "Foreground", def: "#ffffff" },
    { key: "background", label: "Background", def: "#000000" },
    { key: "cursor", label: "Cursor", def: "#ffffff" },
    { key: "cursorAccent", label: "Cursor Text", def: "#000000" },
    { key: "selectionBackground", label: "Selection Background", def: "#5a7898" },
  ];

  const ansiColors: { key: ColorKey; label: string }[] = [
    { key: "black", label: "Black" },
    { key: "red", label: "Red" },
    { key: "green", label: "Green" },
    { key: "yellow", label: "Yellow" },
    { key: "blue", label: "Blue" },
    { key: "magenta", label: "Magenta" },
    { key: "cyan", label: "Cyan" },
    { key: "white", label: "White" },
    { key: "brightBlack", label: "Bright Black" },
    { key: "brightRed", label: "Bright Red" },
    { key: "brightGreen", label: "Bright Green" },
    { key: "brightYellow", label: "Bright Yellow" },
    { key: "brightBlue", label: "Bright Blue" },
    { key: "brightMagenta", label: "Bright Magenta" },
    { key: "brightCyan", label: "Bright Cyan" },
    { key: "brightWhite", label: "Bright White" },
  ];

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 py-1 text-[13px] font-medium text-foreground hover:text-foreground/80 cursor-pointer"
        >
          <ChevronRight className={`size-3.5 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
          <span>Color Overrides</span>
        </button>
        {hasAny && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
          >
            Reset Overrides
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 ml-4 p-3 rounded-lg border border-border bg-muted/20 space-y-4">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Base Colors</div>
            <div className="grid grid-cols-2 gap-3">
              {baseColors.map(c => (
                <div key={c.key} className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-foreground">{c.label}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={current[c.key] ?? c.def}
                      onChange={e => updateColor(c.key, e.target.value)}
                      className="h-6 w-6 rounded border border-border p-0.5 bg-background cursor-pointer"
                    />
                    <input
                      type="text"
                      value={current[c.key] ?? ""}
                      placeholder={c.def}
                      onChange={e => updateColor(c.key, e.target.value)}
                      className="w-20 bg-background border border-input rounded px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-px bg-border/40" />
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">ANSI Colors</div>
            <div className="grid grid-cols-2 gap-2">
              {ansiColors.map(c => (
                <div key={c.key} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">{c.label}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={current[c.key] ?? "#888888"}
                      onChange={e => updateColor(c.key, e.target.value)}
                      className="h-5 w-5 rounded border border-border p-0.5 bg-background cursor-pointer"
                    />
                    <input
                      type="text"
                      value={current[c.key] ?? ""}
                      placeholder="#..."
                      onChange={e => updateColor(c.key, e.target.value)}
                      className="w-20 bg-background border border-input rounded px-1 py-0.5 font-mono text-[10px] text-foreground"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UIZoomControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const percent = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0.7, Math.round((value - 0.1) * 10) / 10))}
        disabled={value <= 0.7}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-background text-foreground hover:bg-muted disabled:opacity-40 transition cursor-pointer"
        title="Zoom out"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-14 text-center font-mono text-[13px] font-medium text-foreground">
        {percent}%
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(1.5, Math.round((value + 0.1) * 10) / 10))}
        disabled={value >= 1.5}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-background text-foreground hover:bg-muted disabled:opacity-40 transition cursor-pointer"
        title="Zoom in"
      >
        <Plus className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange(1.0)}
        disabled={value === 1.0}
        className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border bg-background text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition cursor-pointer"
        title="Reset zoom to 100%"
      >
        <RotateCcw className="size-3" />
        <span>Reset</span>
      </button>
    </div>
  );
}

function AppearanceSection({
  id,
  icon: Icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const contentId = `appearance-section-${id}`;
  return (
    <div className={`overflow-hidden rounded-xl border bg-card transition-colors ${open ? "border-ring/40 shadow-xs" : "border-border/60"}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-foreground [&_svg]:size-4">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-foreground">{title}</span>
          {!open && summary ? (
            <span className="block truncate text-[12px] text-muted-foreground">{summary}</span>
          ) : null}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180 text-foreground" : ""}`}
        />
      </button>
      {open && (
        <div id={contentId} role="region" className="border-t border-border/50 px-4 pt-4 pb-5 space-y-5">
          {children}
        </div>
      )}
    </div>
  );
}

function AppearanceAdvancedDisclosure({
  label = "Advanced",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 pt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 py-1 text-[13px] font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
      >
        <ChevronRight
          className={`size-3.5 transition-transform duration-200 ${open ? "rotate-90 text-foreground" : ""}`}
        />
        <span>{label}</span>
      </button>
      {open && <div className="ml-4 pt-3 space-y-4 border-l border-border/40 pl-3">{children}</div>}
    </div>
  );
}

// Preview
function MiniTerminalPreview({
  settings,
  target,
  showDivider = false,
}: {
  settings: HydraSettings;
  target: "dark" | "light";
  showDivider?: boolean;
}) {
  const sysDark = target === "dark";
  const previewSettings = { ...settings, theme: target } as HydraSettings;
  const appearance = resolveEffectiveTerminalAppearance(previewSettings, sysDark);
  const theme = appearance.theme as ITheme | null;
  if (!theme) return null;
  const ansi = [theme.black, theme.red, theme.green, theme.yellow, theme.blue, theme.magenta, theme.cyan, theme.white, theme.brightBlack, theme.brightRed, theme.brightGreen, theme.brightYellow, theme.brightBlue, theme.brightMagenta, theme.brightCyan, theme.brightWhite];
  const dividerW = Math.max(1, settings.terminal_divider_thickness_px ?? 1);
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="px-3 py-2 flex items-center justify-between text-[12px] border-b border-border" style={{ background: theme.background, color: theme.foreground }}>
        <span className="font-medium">{target === "dark" ? "Dark Preview" : "Light Preview"} — {appearance.themeName}</span>
        <span className="text-[11px] opacity-60">divider {appearance.dividerColor} ({dividerW}px)</span>
      </div>
      <div className="p-4 space-y-3" style={{ background: theme.background, color: theme.foreground, fontFamily: settings.terminal_font_family, fontSize: 11 }}>
        <div className="flex gap-1.5 flex-wrap">{ansi.map((c, i) => (<span key={i} className="w-5 h-5 rounded border border-white/10" style={{ background: c ?? "#000" }} />))}</div>
        {showDivider ? (
          <div className="grid grid-cols-2 gap-0 border rounded overflow-hidden" style={{ borderColor: appearance.dividerColor }}>
            <div className="p-3 font-mono text-[11px] leading-relaxed border-r" style={{ borderColor: appearance.dividerColor, borderWidth: `${dividerW}px` }}>
              <div><span style={{ color: theme.green }}>$</span> hydra --help</div>
              <div className="opacity-80">Hydra ADE — Fleet Orchestrator</div>
              <div><span style={{ color: theme.cyan }}>✔</span> cargo test <span className="opacity-60">0.42s</span></div>
            </div>
            <div className="p-3 font-mono text-[11px] leading-relaxed" style={{ opacity: settings.terminal_inactive_pane_opacity ?? 0.9 }}>
              <div><span style={{ color: theme.yellow }}>$</span> git diff</div>
              <div style={{ color: theme.red }}>- const padding = 2;</div>
              <div style={{ color: theme.green }}>+ const padding = 4;</div>
            </div>
          </div>
        ) : (
          <div className="font-mono text-[11px] leading-relaxed space-y-1">
            <div><span style={{ color: theme.green }}>$</span> hydra --help</div>
            <div className="opacity-80">Hydra ADE — Autonomous Development Environment</div>
            <div><span style={{ color: theme.cyan }}>✔</span> cargo test --workspace <span className="opacity-60">0.42s</span></div>
          </div>
        )}
        <div className="h-px w-full" style={{ background: appearance.dividerColor }} />
        <div className="text-[10px] opacity-60 flex items-center justify-between">
          <span>font {settings.terminal_font_family} · {settings.terminal_font_size}px · weight {settings.terminal_font_weight}/{settings.terminal_font_weight_bold}</span>
          <span>cursor: {settings.terminal_cursor_style ?? "block"} ({settings.terminal_cursor_opacity ?? 1})</span>
        </div>
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

type HydraNavId = "appearance" | "agents" | "input" | "shortcuts" | "security" | "git" | "general" | "terminal";

export function SettingsModal({ isOpen, onClose, onSaved, onLiveChange }: SettingsModalProps) {
  const [activeId, setActiveId] = useState<HydraNavId>("general");
  const [settings, setSettings] = useState<HydraSettings>(DEFAULT_HYDRA_SETTINGS);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [shortcutFilter, setShortcutFilter] = useState("");
  const [themeSearch, setThemeSearch] = useState("");
  const [terminalTarget, setTerminalTarget] = useState<"dark" | "light">("dark");
  const [showPreviewDivider, setShowPreviewDivider] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [previewTerminalFont, setPreviewTerminalFont] = useState<string | null>(null);
  const [previewAppFont, setPreviewAppFont] = useState<string | null>(null);
  const [availableAgents, setAvailableAgents] = useState<{ id: string; label: string }[]>([]);
  const [availableShells, setAvailableShells] = useState<{ id: string; label: string; path: string }[]>([]);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [worktreeRootDraft, setWorktreeRootDraft] = useState("");
  const [scrollbackMode, setScrollbackMode] = useState<"preset" | "custom">("preset");
  const [scrollbackDraft, setScrollbackDraft] = useState<string>("10000");
  const [contrastDraft, setContrastDraft] = useState<number>(4.5);
  const [terminalSessions, setTerminalSessions] = useState<string[]>([]);
  const [terminalSessionsLoading, setTerminalSessionsLoading] = useState(false);
  const [openAppearanceSections, setOpenAppearanceSections] = useState<Record<string, boolean>>({
    interface: true,
    terminal: true,
    window: true,
  });
  const toggleAppearanceSection = (id: string) => {
    setOpenAppearanceSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const leftSidebarStyle = useMemo(() => {
    const sysDark = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : true;
    return resolveLeftSidebarStyleVariables(settings, sysDark) as React.CSSProperties | undefined;
  }, [settings]);
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

  const refreshTerminalSessions = () => {
    setTerminalSessionsLoading(true);
    invoke<string[]>("list_terminal_sessions").then((list)=> setTerminalSessions(Array.isArray(list)? list : [])).catch(()=>{}).finally(()=> setTerminalSessionsLoading(false));
  };
  useEffect(() => {
    if (isOpen) {
      invoke<HydraSettings>("get_settings").then((s) => {
        if (s) {
          const n = normalizeHydraSettings(s);
          setSettings(n);
          setTerminalTarget(resolveEffectiveTerminalAppearance(n, getSystemPrefersDark()).mode);
          setScrollbackDraft(String(n.terminal_scrollback_rows));
          setContrastDraft(n.terminal_minimum_contrast_ratio ?? 4.5);
          const isPreset = ([5000, 10000, 25000, 50000] as readonly number[]).includes(n.terminal_scrollback_rows);
          setScrollbackMode(isPreset ? "preset" : "custom");
        }
      }).catch(console.error);
      refreshTerminalSessions();
      invoke<Array<{ id?: string; name?: string; label?: string }>>("list_available_agents").then((a) => {
        if (Array.isArray(a)) {
          setAvailableAgents(a.map((x) => ({ id: x.id ?? x.name ?? "agent", label: x.label ?? x.name ?? "Agent" })));
        }
      }).catch(()=>{});
      invoke<Array<{ id: string; label: string; path: string }>>("list_available_shells").then((s)=>{
        if (Array.isArray(s)) setAvailableShells(s.map((x)=>({id:x.id, label:x.label, path:x.path})));
      }).catch(()=>{});
      invoke<string>("get_app_version").then(setAppVersion).catch(()=>{});
    }
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);


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

  // Groups: Orca-faithful (Setup → Interface → Workspace → Capabilities → Privacy)
  const navGroups: { id: string; title: string; items: { id: HydraNavId; label: string; icon: React.ElementType; badge?: string }[] }[] = [
    { id: "setup", title: "Setup", items: [
      { id: "general", label: "General", icon: Sliders },
    ]},
    { id: "interface", title: "Interface", items: [
      { id: "appearance", label: "Appearance", icon: Palette },
      { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
    ]},
    { id: "workspace", title: "Workspace", items: [
      { id: "git", label: "Workspace & Git", icon: FolderGit2 },
      { id: "terminal", label: "Terminal Execution", icon: TerminalSquare },
    ]},
    { id: "capabilities", title: "AI Capabilities", items: [
      { id: "agents", label: "Agents", icon: Bot },
    ]},
    { id: "security", title: "Privacy & Security", items: [
      { id: "security", label: "Security & Gate", icon: Shield },
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
        <aside
          className="flex w-[280px] shrink-0 flex-col border-r border-worktree-sidebar-border bg-worktree-sidebar"
          style={leftSidebarStyle}
        >
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
              {activeId==="general" && <><Sliders className="size-4 text-emerald-500" /> General</>}
              {activeId==="appearance" && <><Palette className="size-4 text-purple-500" /> Appearance</>}
              {activeId==="agents" && <><Bot className="size-4 text-emerald-500" /> Agents</>}
              {activeId==="input" && <><TextCursorInput className="size-4 text-blue-500" /> Input</>}
              {activeId==="shortcuts" && <><Keyboard className="size-4 text-amber-500" /> Shortcuts</>}
              {activeId==="security" && <><Shield className="size-4 text-red-500" /> Security & Gate</>}
              {activeId==="git" && <><FolderGit2 className="size-4" /> Workspace & Git</>}
              {activeId==="terminal" && <><TerminalSquare className="size-4 text-emerald-500" /> Terminal Execution</>}
            </h2>
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground"><X className="size-4" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-8 py-8 pb-24">
              {activeId==="general" && (
                <div className="space-y-6">
                  {/* Header — Orca General 1:1 */}
                  <div className="space-y-1">
                    <h3 className="text-[20px] font-semibold tracking-tight">General</h3>
                    <p className="text-[13px] text-muted-foreground">Workspace defaults, app setup, and maintenance.</p>
                  </div>
                  {/* Navigation — app shell */}
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="p-6 space-y-6">
                      <div>
                        <h4 className="text-[13px] font-semibold">Navigation</h4>
                        <p className="text-[12px] text-muted-foreground">App shell and tab behavior.</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-2">
                        <div>
                          <div className="text-[13px] font-medium">Tab Order</div>
                          <div className="text-[12px] text-muted-foreground">Ctrl+Tab cycles MRU vs LRU.</div>
                        </div>
                        <div className="relative">
                          <select
                            value={settings.ctrl_tab_order_mode ?? "mru"}
                            onChange={(e)=> setSettingsLive({ ...settings, ctrl_tab_order_mode: e.target.value as "mru" | "lru" })}
                            className="appearance-none bg-background border rounded-md pl-3 pr-8 py-2 text-[13px] min-w-[160px] focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="mru">Most recent</option>
                            <option value="lru">Least recent</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between gap-4 py-1">
                        <div className="pr-4">
                          <div className="text-[13px] font-medium">Confirm before closing pinned tabs</div>
                          <div className="text-[12px] text-muted-foreground">Show a confirmation dialog before a pinned tab is closed.</div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(settings.confirm_close_pinned_tab ?? true)}
                          onClick={()=> setSettingsLive({ ...settings, confirm_close_pinned_tab: !(settings.confirm_close_pinned_tab ?? true) })}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${(settings.confirm_close_pinned_tab ?? true) ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${(settings.confirm_close_pinned_tab ?? true) ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground px-1">Workspace, Git and Open In moved to <span className="font-medium text-foreground">Workspace → Workspace & Git</span> for coherence (Orca: Workflows → Git).</p>
                </div>
              )}
              {activeId==="appearance" && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-[20px] font-semibold tracking-tight">Appearance</h3>
                    <p className="text-[13px] text-muted-foreground">Theme, zoom, typography, terminal appearance, and workspace sidebars.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Section 1: Interface */}
                    <AppearanceSection
                      id="interface"
                      icon={AppWindow}
                      title="Interface"
                      summary={`${settings.theme === "system" ? "System" : settings.theme === "dark" ? "Dark" : "Light"} · ${Math.round((settings.ui_zoom ?? 1) * 100)}% · ${(settings.app_font_family || "Geist").split(",")[0].trim().replace(/['"]/g, "")}`}
                      open={openAppearanceSections.interface}
                      onToggle={() => toggleAppearanceSection("interface")}
                    >
                      <div className="space-y-5 divide-y divide-border/40">
                        <div className="flex items-center justify-between gap-4 pt-1">
                          <div>
                            <div className="text-[13px] font-medium text-foreground">Theme</div>
                            <div className="text-[12px] text-muted-foreground">App chrome theme. System respects prefers-color-scheme.</div>
                          </div>
                          <SegmentedControl
                            value={settings.theme}
                            onChange={(v)=>handleThemeChange(v as HydraSettings["theme"])}
                            options={[{value:"system",label:"System"},{value:"dark",label:"Dark"},{value:"light",label:"Light"}]}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-4 pt-4">
                          <div>
                            <div className="text-[13px] font-medium text-foreground">UI Zoom</div>
                            <div className="text-[12px] text-muted-foreground">Scale interface density and font proportions.</div>
                          </div>
                          <UIZoomControl
                            value={settings.ui_zoom ?? 1}
                            onChange={(z) => {
                              setSettingsLive({ ...settings, ui_zoom: z });
                              document.documentElement.style.zoom = String(z);
                            }}
                          />
                        </div>

                        <div className="space-y-2 pt-4">
                          <div className="text-[13px] font-medium text-foreground">IDE Font</div>
                          <p className="text-[12px] text-muted-foreground">Interface typeface for sidebar, titlebar and panels. Preview updates live.</p>
                          <FontAutocomplete
                            value={previewAppFont ?? settings.app_font_family}
                            suggestions={interfaceFontSuggestions}
                            placeholder="Geist"
                            onPreviewFontFamily={setPreviewAppFont}
                            onChange={(v)=>{
                              const next = { ...settings, app_font_family: v.trim() || "Geist, sans-serif" };
                              setSettingsLive(next);
                              document.documentElement.style.setProperty("--app-font-family", next.app_font_family);
                              document.body.style.fontFamily = next.app_font_family;
                            }}
                          />
                          <div className="text-[11px] text-muted-foreground" style={{ fontFamily: previewAppFont ?? settings.app_font_family }}>
                            Preview: The quick brown fox jumps over the lazy dog — 1234567890
                          </div>
                        </div>
                      </div>
                    </AppearanceSection>

                    {/* Section 2: Terminal */}
                    <AppearanceSection
                      id="terminal"
                      icon={TerminalSquare}
                      title="Terminal"
                      summary={`${settings.terminal_theme_dark} · ${(settings.terminal_font_family || "SF Mono").split(",")[0].trim().replace(/['"]/g, "")} · ${settings.terminal_font_size}px`}
                      open={openAppearanceSections.terminal}
                      onToggle={() => toggleAppearanceSection("terminal")}
                    >
                      <div className="space-y-6">
                        {/* 1. Terminal Typography (FIRST per Orca order) */}
                        <div className="space-y-4">
                          <div className="text-[13px] font-semibold text-foreground">Terminal Typography</div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className="block text-[12px] font-medium mb-1.5 text-foreground">Font Family</label>
                              <FontAutocomplete
                                value={previewTerminalFont ?? settings.terminal_font_family}
                                suggestions={terminalFontSuggestions}
                                placeholder="JetBrains Mono"
                                onPreviewFontFamily={setPreviewTerminalFont}
                                onChange={(v)=>setSettingsLive({ ...settings, terminal_font_family: v })}
                              />
                              <div className="text-[11px] text-muted-foreground mt-1 font-mono" style={{ fontFamily: previewTerminalFont ?? settings.terminal_font_family }}>
                                Preview: hydra --help — 0123456789 — ligatures fi fl
                              </div>
                            </div>
                            <div>
                              <label className="block text-[12px] font-medium mb-1.5 text-foreground">Font Size (px)</label>
                              <input type="number" min={8} max={32} value={settings.terminal_font_size} onChange={(e)=>setSettingsLive({ ...settings, terminal_font_size: Number(e.target.value) })} className="w-full bg-background border border-input rounded-md px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                            </div>
                          </div>

                          {/* Typography > Advanced (Line height, weights) */}
                          <AppearanceAdvancedDisclosure label="Advanced Typography">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[12px] font-medium mb-1.5 text-foreground">Line Height</label>
                                <input type="number" min={0.8} max={2} step={0.05} value={settings.terminal_line_height} onChange={(e)=>setSettingsLive({ ...settings, terminal_line_height: Number(e.target.value) })} className="w-full bg-background border border-input rounded-md px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                              </div>
                              <div>
                                <label className="block text-[12px] font-medium mb-1.5 text-foreground">Weight Normal</label>
                                <input type="number" min={100} max={900} step={100} value={settings.terminal_font_weight} onChange={(e)=>setSettingsLive({ ...settings, terminal_font_weight: Number(e.target.value) })} className="w-full bg-background border border-input rounded-md px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                              </div>
                              <div>
                                <label className="block text-[12px] font-medium mb-1.5 text-foreground">Weight Bold</label>
                                <input type="number" min={100} max={900} step={100} value={settings.terminal_font_weight_bold} onChange={(e)=>setSettingsLive({ ...settings, terminal_font_weight_bold: Number(e.target.value) })} className="w-full bg-background border border-input rounded-md px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                              </div>
                            </div>
                          </AppearanceAdvancedDisclosure>
                        </div>

                        {/* 2. Terminal Themes (SECOND per Orca order) */}
                        <div className="space-y-4 pt-4 border-t border-border/40">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[13px] font-semibold text-foreground">Terminal Themes</div>
                              <div className="text-[12px] text-muted-foreground">Catalog: {DEFAULT_TERMINAL_THEME_DARK} (dark) + {DEFAULT_TERMINAL_THEME_LIGHT} (light)</div>
                            </div>
                            <button onClick={handleImportCustomTheme} className="px-3 py-1.5 rounded-md border border-border bg-background text-[12px] text-foreground hover:bg-muted flex items-center gap-1.5 transition cursor-pointer">
                              <Upload className="size-3.5" /> Import JSON/YAML
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] font-medium text-foreground">Target</span>
                            <SegmentedControl value={terminalTarget} onChange={(v)=>setTerminalTarget(v as "dark"|"light")} options={[{value:"dark",label:"Dark"},{value:"light",label:"Light"}]} />
                            {isLightTarget && (
                              <label className="ml-2 flex items-center gap-2 text-[12px] text-foreground cursor-pointer">
                                <input type="checkbox" checked={matchDarkMode} onChange={()=>setSettingsLive({ ...settings, terminal_use_separate_light_theme: !settings.terminal_use_separate_light_theme })} className="accent-emerald-600" />
                                Match dark mode
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
                                onSelect={(v)=>setSettingsLive(isLightTarget ? { ...settings, terminal_theme_light: v } : { ...settings, terminal_theme_dark: v })}
                              />
                              <div className="flex items-center justify-between gap-4 py-2 border-t border-border/40">
                                <div className="space-y-0.5">
                                  <div className="text-[13px] font-medium text-foreground">{isLightTarget ? "Light Divider Color" : "Dark Divider Color"}</div>
                                  <div className="text-[12px] text-muted-foreground">Controls the split divider line between panes in {terminalTarget} mode.</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <input type="color" value={isLightTarget ? settings.terminal_divider_color_light : settings.terminal_divider_color_dark} onChange={(e)=>setSettingsLive(isLightTarget ? { ...settings, terminal_divider_color_light: e.target.value } : { ...settings, terminal_divider_color_dark: e.target.value })} className="h-8 w-8 rounded border border-border p-1 cursor-pointer bg-background" />
                                  <input value={isLightTarget ? settings.terminal_divider_color_light : settings.terminal_divider_color_dark} onChange={(e)=>setSettingsLive(isLightTarget ? { ...settings, terminal_divider_color_light: e.target.value } : { ...settings, terminal_divider_color_dark: e.target.value })} className="w-28 bg-background border border-input rounded-md px-2.5 py-1.5 font-mono text-[12px] text-foreground text-center" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg border bg-muted/30 p-3 text-[12px] text-muted-foreground">Light mode is matching dark. Disable “Match dark mode” to pick a separate light theme/divider.</div>
                          )}
                          {importError && <div className="text-[12px] text-destructive">{importError}</div>}
                          {(settings.terminal_custom_themes ?? []).length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[12px] font-medium text-foreground">Imported Custom Themes ({(settings.terminal_custom_themes ?? []).length}/200)</div>
                              <div className="space-y-1 max-h-[140px] overflow-y-auto">
                                {normalizeTerminalCustomThemes(settings.terminal_custom_themes).map((t)=>(
                                  <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-[12px] text-foreground">
                                    <span className="w-3.5 h-3.5 rounded border border-border" style={{ background: t.terminal.background }} />
                                    <span className="flex-1 truncate">{t.name} <span className="text-muted-foreground">({t.id})</span></span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t.source}</span>
                                    <button onClick={()=>setSettingsLive({ ...settings, terminal_custom_themes: (settings.terminal_custom_themes ?? []).filter((x)=>x.id!==t.id) })} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive cursor-pointer"><Trash2 className="size-3.5" /></button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Themes > Advanced (1:1 with Orca screenshot) */}
                          <AppearanceAdvancedDisclosure label="Advanced">
                            <div className="space-y-6 pt-1">
                              {/* 1. Terminal Cursor */}
                              <div className="space-y-2">
                                <h4 className="text-[13px] font-semibold text-foreground">Terminal Cursor</h4>
                                <div className="divide-y divide-border/30">
                                  <div className="flex items-center justify-between gap-4 py-2.5">
                                    <div className="text-[13px] font-medium text-foreground">Cursor Shape</div>
                                    <SegmentedControl
                                      value={settings.terminal_cursor_style ?? "block"}
                                      onChange={(v) => setSettingsLive({ ...settings, terminal_cursor_style: v as HydraSettings["terminal_cursor_style"] })}
                                      options={[
                                        { value: "bar", label: "Bar" },
                                        { value: "block", label: "Block" },
                                        { value: "underline", label: "Underline" },
                                      ]}
                                    />
                                  </div>
                                  <SettingsSwitchRow
                                    label="Blinking Cursor"
                                    checked={settings.terminal_cursor_blink !== false}
                                    onChange={() => setSettingsLive({ ...settings, terminal_cursor_blink: !(settings.terminal_cursor_blink !== false) })}
                                  />
                                  <SettingsNumberRow
                                    label="Cursor Opacity"
                                    defaultValue={1}
                                    value={settings.terminal_cursor_opacity ?? 1}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    suffix="0-1"
                                    onChange={(val) => setSettingsLive({ ...settings, terminal_cursor_opacity: val })}
                                  />
                                </div>
                              </div>

                              {/* 2. Terminal Panes */}
                              <div className="space-y-2">
                                <h4 className="text-[13px] font-semibold text-foreground">Terminal Panes</h4>
                                <div className="divide-y divide-border/30">
                                  <SettingsNumberRow
                                    label="Inactive Pane Opacity"
                                    description="Dim unfocused panes."
                                    defaultValue={0.9}
                                    value={settings.terminal_inactive_pane_opacity ?? 0.9}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    suffix="0-1"
                                    onChange={(val) => setSettingsLive({ ...settings, terminal_inactive_pane_opacity: val })}
                                  />
                                  <SettingsNumberRow
                                    label="Divider Thickness"
                                    defaultValue={1}
                                    value={settings.terminal_divider_thickness_px ?? 3}
                                    min={1}
                                    max={16}
                                    step={1}
                                    suffix="px"
                                    onChange={(val) => setSettingsLive({ ...settings, terminal_divider_thickness_px: val })}
                                  />
                                </div>
                              </div>

                              {/* 3. Window */}
                              <div className="space-y-2">
                                <div>
                                  <h4 className="text-[13px] font-semibold text-foreground">Window</h4>
                                  <p className="text-[12px] text-muted-foreground">Window appearance and background settings.</p>
                                </div>
                                <div className="divide-y divide-border/30">
                                  <SettingsNumberRow
                                    label="Background Opacity"
                                    description="Controls the transparency of the terminal background. 1 is fully opaque, 0 is fully transparent."
                                    defaultValue={1}
                                    value={settings.terminal_background_opacity ?? 1}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    suffix="0 to 1"
                                    onChange={(val) => setSettingsLive({ ...settings, terminal_background_opacity: val })}
                                  />
                                  <SettingsSwitchRow
                                    label="Window Blur"
                                    description="Apply background blur to the terminal window. Requires restart."
                                    checked={Boolean(settings.window_background_blur)}
                                    onChange={() => setSettingsLive({ ...settings, window_background_blur: !settings.window_background_blur })}
                                  />
                                  <SettingsNumberRow
                                    label="Horizontal Padding"
                                    defaultValue={4}
                                    value={settings.terminal_padding_x ?? 4}
                                    min={0}
                                    max={128}
                                    step={1}
                                    suffix="px"
                                    onChange={(val) => setSettingsLive({ ...settings, terminal_padding_x: val })}
                                  />
                                  <SettingsNumberRow
                                    label="Vertical Padding"
                                    defaultValue={4}
                                    value={settings.terminal_padding_y ?? 4}
                                    min={0}
                                    max={128}
                                    step={1}
                                    suffix="px"
                                    onChange={(val) => setSettingsLive({ ...settings, terminal_padding_y: val })}
                                  />
                                  <SettingsSwitchRow
                                    label="Hide Mouse While Typing"
                                    checked={Boolean(settings.terminal_mouse_hide_while_typing)}
                                    onChange={() => setSettingsLive({ ...settings, terminal_mouse_hide_while_typing: !settings.terminal_mouse_hide_while_typing })}
                                  />
                                  <ColorOverridesSection
                                    settings={settings}
                                    onChange={(overrides) => setSettingsLive({ ...settings, terminal_color_overrides: overrides })}
                                  />
                                </div>
                              </div>
                            </div>
                          </AppearanceAdvancedDisclosure>

                          {/* Dark / Light Mode Preview with Pane divider switch (1:1 with Orca screenshot) */}
                          <div className="space-y-3 pt-3 border-t border-border/40">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-[13px] font-semibold text-foreground">
                                  {terminalTarget === "dark" ? "Dark Mode Preview" : "Light Mode Preview"}
                                </h4>
                                <p className="text-[12px] text-muted-foreground">
                                  Shows the effective {terminalTarget} terminal appearance.
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] text-muted-foreground">Pane divider</span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={showPreviewDivider}
                                  onClick={() => setShowPreviewDivider(!showPreviewDivider)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${showPreviewDivider ? "bg-emerald-600 border-emerald-600" : "bg-input border-transparent"}`}
                                >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${showPreviewDivider ? "translate-x-4" : "translate-x-0.5"}`} />
                                </button>
                              </div>
                            </div>
                            <MiniTerminalPreview
                              settings={previewTerminalFont ? { ...settings, terminal_font_family: previewTerminalFont } : settings}
                              target={terminalTarget}
                              showDivider={showPreviewDivider}
                            />
                          </div>
                        </div>
                      </div>
                    </AppearanceSection>

                    {/* Section 3: Window & Sidebar (1:1 with Orca screenshot) */}
                    <AppearanceSection
                      id="window"
                      icon={PanelLeft}
                      title="Window & Sidebar"
                      summary="Sidebar, status bar, and file explorer"
                      open={openAppearanceSections.window}
                      onToggle={() => toggleAppearanceSection("window")}
                    >
                      <div className="space-y-5 divide-y divide-border/40">
                        {/* 1. Left Sidebar Appearance */}
                        <div className="space-y-3 pt-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-[13px] font-medium text-foreground">Left Sidebar Appearance</div>
                              <div className="text-[12px] text-muted-foreground">Make the left sidebar match your terminal, stay default, or use a tint.</div>
                            </div>
                            <SegmentedControl
                              value={settings.left_sidebar_appearance_mode ?? "default"}
                              onChange={(v) => setSettingsLive({ ...settings, left_sidebar_appearance_mode: v as HydraSettings["left_sidebar_appearance_mode"] })}
                              options={[
                                { value: "default", label: "Default" },
                                { value: "match-terminal", label: "Match Terminal" },
                                { value: "tinted", label: "Tinted" },
                              ]}
                            />
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg border border-border mt-2 transition-colors" style={leftSidebarStyle}>
                            <div className="w-3.5 h-3.5 rounded-full border border-border" style={{ background: "var(--worktree-sidebar-accent, #353535)" }} />
                            <span className="text-[12px] font-medium" style={{ color: "var(--worktree-sidebar-foreground, #fafafa)" }}>
                              Preview: Left Sidebar Surface ({settings.left_sidebar_appearance_mode ?? "default"})
                            </span>
                          </div>
                          {(settings.left_sidebar_appearance_mode === "tinted") && (
                            <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/20 p-3 mt-2">
                              <div>
                                <label className="block text-[12px] font-medium mb-1.5 text-foreground">Sidebar Tint</label>
                                <div className="flex gap-2">
                                  <input
                                    type="color"
                                    value={settings.left_sidebar_tint_color ?? "#336699"}
                                    onChange={(e) => setSettingsLive({ ...settings, left_sidebar_tint_color: e.target.value })}
                                    className="h-8 w-8 rounded border border-border p-1 bg-background cursor-pointer"
                                  />
                                  <input
                                    value={settings.left_sidebar_tint_color ?? "#336699"}
                                    onChange={(e) => setSettingsLive({ ...settings, left_sidebar_tint_color: e.target.value })}
                                    className="flex-1 bg-background border border-input rounded-md px-2.5 py-1 text-xs font-mono text-foreground"
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-[12px] mb-1.5 text-foreground">
                                  <span>Tint Strength</span>
                                  <span className="font-mono">{Math.round((settings.left_sidebar_tint_opacity ?? 0.1) * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={0.5}
                                  step={0.01}
                                  value={settings.left_sidebar_tint_opacity ?? 0.1}
                                  onChange={(e) => setSettingsLive({ ...settings, left_sidebar_tint_opacity: Number(e.target.value) })}
                                  className="w-full mt-1.5"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 2. Status Bar (TODO / Em desenvolvimento) */}
                        <div className="space-y-3 pt-4">
                          <div>
                            <div className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                              <span>Status Bar</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-medium">TODO / Em desenvolvimento</span>
                            </div>
                            <div className="text-[12px] text-muted-foreground mt-0.5">A superfície da barra de status inferior ainda não foi implementada no Hydra. Os indicadores serão ativados quando a barra de status for adicionada ao layout.</div>
                          </div>
                          <div className="divide-y divide-border/30 rounded-xl border border-dashed border-border/80 bg-muted/10 opacity-75">
                            <div className="p-3 flex items-center justify-between gap-4">
                              <div>
                                <div className="text-[13px] font-medium text-foreground">Usage percentages</div>
                                <div className="text-[12px] text-muted-foreground">Choose whether provider limits show the percentage used or remaining.</div>
                              </div>
                              <SegmentedControl
                                value={settings.usage_percentage_display ?? "used"}
                                onChange={(v) => setSettingsLive({ ...settings, usage_percentage_display: v as "used" | "remaining" })}
                                options={[
                                  { value: "used", label: "Used" },
                                  { value: "remaining", label: "Remaining" },
                                ]}
                              />
                            </div>
                            <div className="px-3 py-1">
                              <SettingsSwitchRow
                                label="Claude Usage"
                                description="Show Claude token and cost usage for the active workspace."
                                checked={settings.status_bar_claude_usage !== false}
                                onChange={() => setSettingsLive({ ...settings, status_bar_claude_usage: !(settings.status_bar_claude_usage !== false) })}
                              />
                            </div>
                            <div className="px-3 py-1">
                              <SettingsSwitchRow
                                label="Antigravity Usage"
                                description="Show Antigravity subscription usage for the active workspace."
                                checked={settings.status_bar_antigravity_usage !== false}
                                onChange={() => setSettingsLive({ ...settings, status_bar_antigravity_usage: !(settings.status_bar_antigravity_usage !== false) })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* 3. Window & Sidebar > Advanced */}
                        <div className="pt-2">
                          <AppearanceAdvancedDisclosure label="Advanced Window & Worktree">
                            <div className="space-y-3">
                              <SettingsSwitchRow
                                label="Compact worktree cards"
                                description="Hide redundant branch and status labels when they match to maximize vertical card density in the fleet sidebar."
                                checked={Boolean(settings.compact_worktree_cards)}
                                onChange={() => setSettingsLive({ ...settings, compact_worktree_cards: !settings.compact_worktree_cards })}
                              />
                              <div className="border-t border-border/30 pt-3">
                                <SettingsSwitchRow
                                  label="Confirm before closing pinned tabs"
                                  description="Show a confirmation prompt when closing pinned workbench tabs."
                                  checked={Boolean(settings.confirm_close_pinned_tab ?? true)}
                                  onChange={() => setSettingsLive({ ...settings, confirm_close_pinned_tab: !(settings.confirm_close_pinned_tab ?? true) })}
                                />
                              </div>
                              <div className="border-t border-border/30 pt-3">
                                <SettingsSwitchRow
                                  label="Confirm before deleting worktrees"
                                  description="Prompt for confirmation before permanently deleting a git worktree."
                                  checked={!Boolean(settings.skip_delete_worktree_confirm)}
                                  onChange={() => setSettingsLive({ ...settings, skip_delete_worktree_confirm: !Boolean(settings.skip_delete_worktree_confirm) })}
                                />
                              </div>
                            </div>
                          </AppearanceAdvancedDisclosure>
                        </div>
                      </div>
                    </AppearanceSection>
                  </div>
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
                  <div className="rounded-xl border bg-amber-500/10 border-amber-500/20 p-4 flex items-start gap-3">
                    <Info className="size-4 text-amber-600 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-[13px] font-medium">Moved to Terminal</div>
                      <div className="text-[12px] text-muted-foreground">Middle-click Paste now lives in <span className="font-medium text-foreground">Workspace → Terminal → Interaction</span> for coherence (Orca: Interface → Input merged). Use search or navigate there.</div>
                      <button onClick={()=>setActiveId("terminal")} className="text-[12px] text-emerald-600 hover:underline">Go to Terminal →</button>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card p-4 opacity-60">
                    <SettingsSwitchRow label="Middle-click Paste from Selection (alias)" description="Alias — canonical control is in Terminal." checked={settings.primary_selection_middle_click_paste} onChange={()=>setSettingsLive({ ...settings, primary_selection_middle_click_paste: !settings.primary_selection_middle_click_paste })} />
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
                  <div className="space-y-1">
                    <h3 className="text-[20px] font-semibold tracking-tight">Workspace & Git</h3>
                    <p className="text-[13px] text-muted-foreground">Where workspaces live, how they appear in the sidebar, and Git defaults — consolidated from General (Orca: Workflows → Git).</p>
                  </div>

                  {/* Workspace Directory — moved from General */}
                  <div className="rounded-xl border bg-card p-6 space-y-3">
                    <h4 className="text-[13px] font-semibold">Workspace Directory</h4>
                    <div className="flex gap-2">
                      <input
                        value={settings.workspace_dir}
                        onChange={(e)=> setSettingsLive({ ...settings, workspace_dir: e.target.value })}
                        placeholder="/home/renan/orca/workspaces"
                        className="flex-1 bg-background border rounded-md px-3 py-2 font-mono text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={async ()=>{
                          try {
                            const picked = await dialogOpen({ directory: true, multiple: false });
                            if (typeof picked === "string" && picked) setSettingsLive({ ...settings, workspace_dir: picked });
                          } catch {}
                        }}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md border bg-background text-[13px] hover:bg-muted"
                      >
                        <FolderGit2 className="size-3.5" /> Browse
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Use relative path (e.g. .orca/worktrees) for per-project, or absolute for shared folder. Duplicated field from General removed — single source of truth.</p>
                  </div>

                  {/* Sources — moved from General */}
                  <div className="rounded-xl border bg-card p-6 space-y-3">
                    <h4 className="text-[13px] font-semibold">Sources</h4>
                    <p className="text-[12px] text-muted-foreground">Shown sources include current and future worktrees in the sidebar.</p>
                    <div className="overflow-hidden rounded-lg border bg-muted/30">
                      {([
                        { id: "claude" as const, label: "Claude Code", sub: ".claude/worktrees/*" },
                        { id: "gsd" as const, label: "GSD", sub: ".gsd-workspaces/*" },
                      ] as const).map((row)=> {
                        const wvd = (settings as any).worktree_visibility_defaults ?? { external: "hide", customSources: [], sourcePreferences: { builtIn: {}, custom: {} } };
                        const vis = (wvd.sourcePreferences?.builtIn?.[row.id] ?? "hide") as "show"|"hide";
                        const setVis = (next: "show"|"hide")=> {
                          const cur = (settings as any).worktree_visibility_defaults ?? { external: "hide", customSources: [], sourcePreferences: { builtIn: {}, custom: {} } };
                          const nextPrefs = { ...(cur.sourcePreferences ?? { builtIn: {}, custom: {} }), builtIn: { ...(cur.sourcePreferences?.builtIn ?? {}), [row.id]: next } };
                          setSettingsLive({ ...settings, worktree_visibility_defaults: { ...cur, sourcePreferences: nextPrefs } } as any);
                        };
                        return (
                          <div key={row.id} className="flex items-center justify-between gap-2 px-3 py-3 border-b last:border-0 bg-card">
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium">{row.label}</div>
                              <div className="font-mono text-[11px] text-muted-foreground">{row.sub}</div>
                            </div>
                            <div className="inline-flex rounded-md border p-0.5 bg-muted">
                              {(["Show","Hide"] as const).map((lbl)=>{
                                const val = lbl.toLowerCase() as "show"|"hide";
                                const active = vis===val;
                                return (
                                  <button key={lbl} onClick={()=> setVis(val)} className={`px-2.5 py-1 text-[11px] rounded font-medium transition ${active ? "bg-foreground text-background shadow" : "text-muted-foreground hover:text-foreground"}`}>{lbl}</button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {(()=>{
                        const wvd = (settings as any).worktree_visibility_defaults ?? { external: "hide", customSources: [], sourcePreferences: { builtIn: {}, custom: {} } };
                        const vis = (wvd.external ?? "hide") as "show"|"hide";
                        const setVis = (next: "show"|"hide")=> {
                          const cur = (settings as any).worktree_visibility_defaults ?? { external: "hide", customSources: [], sourcePreferences: { builtIn: {}, custom: {} } };
                          setSettingsLive({ ...settings, worktree_visibility_defaults: { ...cur, external: next } } as any);
                        };
                        return (
                          <div className="flex items-center justify-between gap-2 px-3 py-3 border-b bg-card">
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium">Other locations</div>
                              <div className="font-mono text-[11px] text-muted-foreground">Outside listed sources</div>
                            </div>
                            <div className="inline-flex rounded-md border p-0.5 bg-muted">
                              {(["Show","Hide"] as const).map((lbl)=>{
                                const val = lbl.toLowerCase() as "show"|"hide";
                                const active = vis===val;
                                return (
                                  <button key={lbl} onClick={()=> setVis(val)} className={`px-2.5 py-1 text-[11px] rounded font-medium transition ${active ? "bg-foreground text-background shadow" : "text-muted-foreground hover:text-foreground"}`}>{lbl}</button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      <div className="px-3 py-3 bg-card space-y-2">
                        <div className="text-[13px] font-medium">Worktree root</div>
                        <div className="flex gap-2">
                          <input
                            value={worktreeRootDraft}
                            onChange={(e)=> setWorktreeRootDraft(e.target.value)}
                            onKeyDown={(e)=> {
                              if (e.key==="Enter" && worktreeRootDraft.trim()) {
                                const cur = (settings as any).worktree_visibility_defaults ?? { external: "hide", customSources: [], sourcePreferences: { builtIn: {}, custom: {} } };
                                const id = Math.random().toString(36).slice(2,10);
                                const next = [...(cur.customSources ?? []), { id, rootPath: worktreeRootDraft.trim() }];
                                setSettingsLive({ ...settings, worktree_visibility_defaults: { ...cur, customSources: next } } as any);
                                setWorktreeRootDraft("");
                              }
                            }}
                            placeholder=""
                            className="flex-1 bg-background border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <button
                            onClick={()=>{
                              if (!worktreeRootDraft.trim()) return;
                              const cur = (settings as any).worktree_visibility_defaults ?? { external: "hide", customSources: [], sourcePreferences: { builtIn: {}, custom: {} } };
                              const id = Math.random().toString(36).slice(2,10);
                              const next = [...(cur.customSources ?? []), { id, rootPath: worktreeRootDraft.trim() }];
                              setSettingsLive({ ...settings, worktree_visibility_defaults: { ...cur, customSources: next } } as any);
                              setWorktreeRootDraft("");
                            }}
                            className="px-4 py-2 rounded-md bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90"
                          >Add</button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Orca will recognize worktrees beneath this folder.</p>
                        {(((settings as any).worktree_visibility_defaults?.customSources ?? []) as Array<{id:string;rootPath:string}>).length>0 && (
                          <div className="space-y-1 pt-2">
                            {((settings as any).worktree_visibility_defaults.customSources as Array<{id:string;rootPath:string}>).map((cs)=>(
                              <div key={cs.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border bg-muted/20 text-[12px]">
                                <span className="truncate font-mono">{cs.rootPath}</span>
                                <button
                                  onClick={()=>{
                                    const cur = (settings as any).worktree_visibility_defaults ?? { external: "hide", customSources: [], sourcePreferences: { builtIn: {}, custom: {} } };
                                    const next = (cur.customSources ?? []).filter((x: {id:string})=> x.id!==cs.id);
                                    setSettingsLive({ ...settings, worktree_visibility_defaults: { ...cur, customSources: next } } as any);
                                  }}
                                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                ><Trash2 className="size-3.5" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="pr-4">
                        <div className="text-[13px] font-medium">Nest Workspaces</div>
                        <div className="text-[12px] text-muted-foreground">Create workspaces inside a repo-named subfolder.</div>
                      </div>
                      <button type="button" role="switch" aria-checked={settings.nest_workspaces} onClick={()=> setSettingsLive({ ...settings, nest_workspaces: !settings.nest_workspaces })} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${settings.nest_workspaces ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${settings.nest_workspaces ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between gap-4">
                      <div className="pr-4">
                        <div className="text-[13px] font-medium">Ask Before Deleting Workspaces</div>
                        <div className="text-[12px] text-muted-foreground">Show a confirmation before deleting a workspace.</div>
                      </div>
                      <button type="button" role="switch" aria-checked={!((settings as any).skip_delete_worktree_confirm ?? false)} onClick={()=> setSettingsLive({ ...settings, skip_delete_worktree_confirm: !((settings as any).skip_delete_worktree_confirm ?? false)} as any)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${!((settings as any).skip_delete_worktree_confirm ?? false) ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${!((settings as any).skip_delete_worktree_confirm ?? false) ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </div>

                  {/* Git defaults */}
                  <div className="rounded-xl border bg-card p-6 space-y-4">
                    <h4 className="text-[13px] font-semibold">Git Defaults</h4>
                    <div><label className="block text-[12px] font-medium mb-1.5">Auto-generated Branch Prefix</label><input value={settings.default_branch_prefix} onChange={(e)=>setSettingsLive({ ...settings, default_branch_prefix: e.target.value })} className="w-full bg-background border rounded-md px-3 py-2 font-mono text-[13px]" /><span className="text-[11px] text-muted-foreground">Prefix for parallel git branches (e.g. feat/, task/).</span></div>
                  </div>

                  {/* Setup Script — moved from Terminal */}
                  <div className="rounded-xl border bg-card p-6 space-y-4">
                    <div>
                      <h4 className="text-[13px] font-semibold">Workspace Setup Script</h4>
                      <p className="text-[12px] text-muted-foreground">Where the repository setup script runs when a new workspace is created.</p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="pr-4">
                        <div className="text-[13px] font-medium">Setup Script Location</div>
                        <div className="text-[12px] text-muted-foreground">"New Tab" opens in background titled "Setup" without stealing focus.</div>
                      </div>
                      <div className="inline-flex rounded-md border p-0.5 bg-muted">
                        {(["new-tab","split-vertical","split-horizontal"] as const).map(v=> {
                          const active = (settings.setup_script_launch_mode ?? "new-tab")===v;
                          const label = v==="new-tab" ? "New Tab" : v==="split-vertical" ? "Split Vertically" : "Split Horizontally";
                          return <button key={v} onClick={()=>setSettingsLive({ ...settings, setup_script_launch_mode: v })} className={`px-2.5 py-1 text-[11px] rounded font-medium transition ${active ? "bg-foreground text-background shadow" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Open In Apps — moved from General */}
                  <div className="rounded-xl border bg-card p-6 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-medium">Open In Apps</div>
                        <div className="text-[12px] text-muted-foreground">Choose apps available from a workspace's Open in menu (used in sidebar context menu).</div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => {
                            const el = document.getElementById("hydra-openin-add-menu-git");
                            if (el) el.classList.toggle("hidden");
                          }}
                          className="h-8 px-3 rounded-md border bg-background text-[13px] flex items-center gap-1.5 hover:bg-muted"
                        >
                          Add app <ChevronDown className="size-3.5" />
                        </button>
                        <div id="hydra-openin-add-menu-git" className="hidden absolute right-0 top-9 z-10 w-64 rounded-md border bg-popover shadow-xl p-1">
                          {getOpenInAppPresets().map(preset => {
                            const apps = (settings.open_in_applications ?? DEFAULT_OPEN_IN_APPLICATIONS) as OpenInApplication[];
                            const added = isOpenInAppPresetAdded(apps, preset);
                            return (
                              <button
                                key={preset.id}
                                disabled={added || apps.length >= 8}
                                onClick={() => {
                                  if (added || apps.length >= 8) return;
                                  const next = [...apps, { id: preset.id, label: preset.label, command: preset.command }];
                                  setSettingsLive({ ...settings, open_in_applications: next } as any);
                                  document.getElementById("hydra-openin-add-menu-git")?.classList.add("hidden");
                                }}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[13px] hover:bg-muted ${added ? "opacity-50" : ""}`}
                              >
                                <OpenInApplicationIcon application={preset} size={14} />
                                <span className="truncate">{preset.label}</span>
                                {added && <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1"><Check className="size-3" /> Added</span>}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => {
                              const apps = (settings.open_in_applications ?? DEFAULT_OPEN_IN_APPLICATIONS) as OpenInApplication[];
                              if (apps.length >= 8) return;
                              const id = `open-in-${Date.now().toString(36)}`;
                              const next = [...apps, { id, label: "", command: "" }];
                              setSettingsLive({ ...settings, open_in_applications: next } as any);
                              document.getElementById("hydra-openin-add-menu-git")?.classList.add("hidden");
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[13px] hover:bg-muted"
                          >
                            <AppWindow className="size-3.5" /> Custom app
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-border/40 border rounded-lg overflow-hidden">
                      {((settings.open_in_applications ?? DEFAULT_OPEN_IN_APPLICATIONS) as OpenInApplication[]).length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">No apps — add VS Code, Zed or Cursor</div>
                      ) : (
                        (settings.open_in_applications ?? DEFAULT_OPEN_IN_APPLICATIONS as OpenInApplication[]).map((app, idx) => (
                          <div key={app.id} className="p-3 flex items-start gap-3 bg-card">
                            <div className="size-7 rounded border bg-background flex items-center justify-center shrink-0">
                              <OpenInApplicationIcon application={app} size={16} />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <input
                                value={app.label}
                                placeholder="App name"
                                onChange={e => {
                                  const next = [...(settings.open_in_applications ?? DEFAULT_OPEN_IN_APPLICATIONS)];
                                  next[idx] = { ...app, label: e.target.value };
                                  setSettingsLive({ ...settings, open_in_applications: next } as any);
                                }}
                                className="w-full bg-background border rounded px-2 py-1 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                              <input
                                value={app.command}
                                placeholder="command (e.g. code, zed, cursor)"
                                spellCheck={false}
                                onChange={e => {
                                  const next = [...(settings.open_in_applications ?? DEFAULT_OPEN_IN_APPLICATIONS)];
                                  next[idx] = { ...app, command: e.target.value };
                                  setSettingsLive({ ...settings, open_in_applications: next } as any);
                                }}
                                className="w-full bg-background border rounded px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const next = (settings.open_in_applications ?? DEFAULT_OPEN_IN_APPLICATIONS).filter(a => a.id !== app.id);
                                setSettingsLive({ ...settings, open_in_applications: next } as any);
                              }}
                              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeId==="terminal" && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-[20px] font-semibold tracking-tight">Terminal Execution</h3>
                    <p className="text-[13px] text-muted-foreground">Shell runtime, rendering engine, scrollback buffer, and keyboard/mouse interaction rules. Typography and themes live in <span className="font-medium text-foreground">Interface → Appearance</span>.</p>
                  </div>

                  {/* Default Shell */}
                  <section className="rounded-xl border bg-card p-4 space-y-3">
                    <h3 className="text-[13px] font-medium">Default Shell</h3>
                    <p className="text-[12px] text-muted-foreground">Which shell Hydra launches for new terminals. Empty = system default (<code>bash</code>).</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select value={settings.terminal_default_shell} onChange={(e)=>setSettingsLive({ ...settings, terminal_default_shell: e.target.value })} className="w-full appearance-none bg-background text-foreground border border-input rounded-md pl-3 pr-8 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring">
                          <option value="">System default (bash)</option>
                          {availableShells.map(s=> <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                      <button onClick={()=>invoke<{id:string;label:string;path:string}[]>("list_available_shells").then((s)=>{ if (Array.isArray(s)) setAvailableShells(s.map((x)=>({id:x.id,label:x.label,path:x.path}))); }).catch(()=>{})} className="px-3 py-2 rounded-md border bg-background text-[12px] hover:bg-muted">Refresh</button>
                    </div>
                    <div className="flex gap-2">
                      <input value={settings.terminal_default_shell} onChange={(e)=>setSettingsLive({ ...settings, terminal_default_shell: e.target.value })} placeholder="Custom shell (e.g. /usr/bin/zsh)" className="flex-1 bg-background border border-input rounded-md px-3 py-2 font-mono text-[12px] focus:outline-none focus:ring-2 focus:ring-ring" />
                      <span className="text-[11px] text-muted-foreground self-center">Current: {settings.terminal_default_shell || "bash"} · {availableShells.length} found</span>
                    </div>
                  </section>
                  {/* Rendering — GPU + Contrast + Inline Images */}
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="p-6 space-y-6">
                      <div>
                        <h4 className="text-[13px] font-semibold">Rendering</h4>
                        <p className="text-[12px] text-muted-foreground">Terminal renderer behavior for live panes and new panes.</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-2">
                        <div className="pr-4">
                          <div className="text-[13px] font-medium">GPU Acceleration</div>
                          <div className="text-[12px] text-muted-foreground">
                            {settings.terminal_gpu_acceleration==="off" ? "WebGL disabled; DOM renderer for max compatibility." : settings.terminal_gpu_acceleration==="on" ? "WebGL is always attempted for terminal panes." : "Auto tries WebGL, with DOM fallback for unsupported or risky renderers."}
                          </div>
                        </div>
                        <SegmentedControl value={settings.terminal_gpu_acceleration} onChange={(v)=>setSettingsLive({ ...settings, terminal_gpu_acceleration: v as any })} options={[{value:"auto",label:"Auto"},{value:"on",label:"On"},{value:"off",label:"Off"}]} />
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between gap-4 py-2">
                        <div className="pr-4">
                          <div className="text-[13px] font-medium">Color Contrast</div>
                          <div className="text-[12px] text-muted-foreground">
                            {(settings.terminal_minimum_contrast_ratio===undefined ? "Balances readability with your terminal theme. Recommended." : settings.terminal_minimum_contrast_ratio===1 ? "Keeps program colors unchanged, including dim text and Powerline separators." : "Choose how much to increase contrast between text and its background.")}
                          </div>
                        </div>
                        <SegmentedControl value={settings.terminal_minimum_contrast_ratio===undefined ? "auto" : settings.terminal_minimum_contrast_ratio===1 ? "off" : "custom"} onChange={(v)=> {
                          if(v==="auto") setSettingsLive({ ...settings, terminal_minimum_contrast_ratio: undefined });
                          else if(v==="off") setSettingsLive({ ...settings, terminal_minimum_contrast_ratio: 1 });
                          else setSettingsLive({ ...settings, terminal_minimum_contrast_ratio: contrastDraft || 4.5 });
                        }} options={[{value:"auto",label:"Automatic"},{value:"off",label:"Off"},{value:"custom",label:"Custom"}]} />
                      </div>
                      {settings.terminal_minimum_contrast_ratio!==undefined && settings.terminal_minimum_contrast_ratio!==1 && (
                        <div className="space-y-3 pb-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium">Contrast target</span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted border">{(contrastDraft ?? settings.terminal_minimum_contrast_ratio ?? 4.5).toFixed(1)}:1</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">Higher values increase contrast where possible. Background colors stay unchanged.</p>
                          <input type="range" min={1.1} max={21} step={0.1} value={contrastDraft ?? settings.terminal_minimum_contrast_ratio ?? 4.5} onChange={(e)=>{ const v=Number(e.target.value); setContrastDraft(v); }} onMouseUp={()=>{ if(contrastDraft!==undefined) setSettingsLive({ ...settings, terminal_minimum_contrast_ratio: contrastDraft }); }} onTouchEnd={()=>{ if(contrastDraft!==undefined) setSettingsLive({ ...settings, terminal_minimum_contrast_ratio: contrastDraft }); }} className="w-full" />
                          <div className="flex justify-between text-[11px] text-muted-foreground"><span>Subtle</span><span>Strong</span></div>
                        </div>
                      )}
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between gap-4 py-2">
                        <div className="pr-4">
                          <div className="text-[13px] font-medium">Inline Images</div>
                          <div className="text-[12px] text-muted-foreground">Display images directly in the terminal using SIXEL, iTerm2 (IIP), and Kitty graphics protocols.</div>
                        </div>
                        <button type="button" role="switch" aria-checked={settings.terminal_inline_images!==false} onClick={()=>setSettingsLive({ ...settings, terminal_inline_images: !(settings.terminal_inline_images!==false) })} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${settings.terminal_inline_images!==false ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${settings.terminal_inline_images!==false ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Terminal Interaction */}
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="p-6 space-y-6">
                      <div>
                        <h4 className="text-[13px] font-semibold">Terminal Interaction</h4>
                        <p className="text-[12px] text-muted-foreground">Mouse and clipboard behavior for terminal panes.</p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="text-[13px] font-medium">Scroll Speed</div>
                            <div className="text-[12px] text-muted-foreground max-w-xl">Adjust how wheel input feels in scrollback and in mouse-aware terminal apps.</div>
                          </div>
                          <button onClick={()=>setSettingsLive({ ...settings, terminal_scroll_sensitivity: 1.15, terminal_fast_scroll_sensitivity: 5, terminal_tui_scroll_sensitivity: 1 })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background text-[12px] hover:bg-muted shrink-0"><RotateCcw className="size-3.5" /> Reset</button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          {[
                            {label:"Normal",desc:"Scrollback wheel multiplier.",val: settings.terminal_scroll_sensitivity ?? 1.15, min:0.5,max:3,step:0.05, key:"terminal_scroll_sensitivity" as const},
                            {label:"Fast",desc:"Extra multiplier while scrolling with a modifier key.",val: settings.terminal_fast_scroll_sensitivity ?? 5, min:1,max:10,step:0.5, key:"terminal_fast_scroll_sensitivity" as const},
                            {label:"TUI",desc:"Discrete wheel reports for full-screen terminal apps.",val: settings.terminal_tui_scroll_sensitivity ?? 1, min:1,max:10,step:1, key:"terminal_tui_scroll_sensitivity" as const},
                          ].map(card=> (
                            <div key={card.key} className="rounded-md border border-border/60 bg-background/50 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-0.5"><div className="text-xs font-medium">{card.label}</div><div className="text-[11px] leading-4 text-muted-foreground">{card.desc}</div></div>
                                <span className="shrink-0 rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] tabular-nums">{Number.isInteger(card.val)? String(card.val) : card.val.toFixed(2).replace(/0+$/,"").replace(/\.$/,"")}x</span>
                              </div>
                              <input type="range" min={card.min} max={card.max} step={card.step} value={card.val} onChange={(e)=> setSettingsLive({ ...settings, [card.key]: Number(e.target.value) } as any)} className="mt-3 w-full" />
                              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground"><span>{card.min}</span><span>{card.max}</span></div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between gap-4 py-3">
                        <div className="pr-4"><div className="text-[13px] font-medium">Right-click to paste</div><div className="text-[12px] text-muted-foreground">Right-click pastes the clipboard. Ctrl+right-click opens the context menu.</div></div>
                        <button type="button" role="switch" aria-checked={Boolean(settings.terminal_right_click_to_paste)} onClick={()=>setSettingsLive({ ...settings, terminal_right_click_to_paste: !settings.terminal_right_click_to_paste })} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${settings.terminal_right_click_to_paste ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${settings.terminal_right_click_to_paste ? "translate-x-4" : "translate-x-0.5"}`} /></button>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between gap-4 py-3">
                        <div className="pr-4"><div className="text-[13px] font-medium">Focus Follows Mouse</div><div className="text-[12px] text-muted-foreground">Hovering a terminal pane activates it without needing to click.</div></div>
                        <button type="button" role="switch" aria-checked={Boolean(settings.terminal_focus_follows_mouse)} onClick={()=>setSettingsLive({ ...settings, terminal_focus_follows_mouse: !settings.terminal_focus_follows_mouse })} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${settings.terminal_focus_follows_mouse ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${settings.terminal_focus_follows_mouse ? "translate-x-4" : "translate-x-0.5"}`} /></button>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between gap-4 py-3">
                        <div className="pr-4"><div className="text-[13px] font-medium">Copy on Select</div><div className="text-[12px] text-muted-foreground">Automatically copy terminal selections to the clipboard.</div></div>
                        <button type="button" role="switch" aria-checked={settings.terminal_clipboard_on_select!==false} onClick={()=>setSettingsLive({ ...settings, terminal_clipboard_on_select: !(settings.terminal_clipboard_on_select!==false) })} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${settings.terminal_clipboard_on_select!==false ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${settings.terminal_clipboard_on_select!==false ? "translate-x-4" : "translate-x-0.5"}`} /></button>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between gap-4 py-3">
                        <div className="pr-4"><div className="text-[13px] font-medium">Trim Gutter on Copy</div><div className="text-[12px] text-muted-foreground">Drop the left gutter agent output is painted behind, so copied text is not indented. Only the indent every selected line shares is removed.</div></div>
                        <button type="button" role="switch" aria-checked={settings.terminal_copy_trims_gutter!==false} onClick={()=>setSettingsLive({ ...settings, terminal_copy_trims_gutter: !(settings.terminal_copy_trims_gutter!==false) })} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${settings.terminal_copy_trims_gutter!==false ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${settings.terminal_copy_trims_gutter!==false ? "translate-x-4" : "translate-x-0.5"}`} /></button>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between gap-4 py-3">
                        <div className="pr-4"><div className="text-[13px] font-medium">Middle-click Paste (Primary Selection)</div><div className="text-[12px] text-muted-foreground">Linux primary selection — moved from Input pane for coherence.</div></div>
                        <button type="button" role="switch" aria-checked={Boolean(settings.primary_selection_middle_click_paste)} onClick={()=>setSettingsLive({ ...settings, primary_selection_middle_click_paste: !settings.primary_selection_middle_click_paste })} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${settings.primary_selection_middle_click_paste ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${settings.primary_selection_middle_click_paste ? "translate-x-4" : "translate-x-0.5"}`} /></button>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between gap-4 py-3">
                        <div className="pr-4"><div className="text-[13px] font-medium">Allow TUI Clipboard Writes (OSC 52)</div><div className="text-[12px] text-muted-foreground">Let programs in the terminal (Zellij, tmux, Neovim, fzf, Grok, SSH) copy to your system clipboard.</div></div>
                        <button type="button" role="switch" aria-checked={settings.terminal_allow_osc52_clipboard!==false} onClick={()=>setSettingsLive({ ...settings, terminal_allow_osc52_clipboard: !(settings.terminal_allow_osc52_clipboard!==false) })} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${settings.terminal_allow_osc52_clipboard!==false ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${settings.terminal_allow_osc52_clipboard!==false ? "translate-x-4" : "translate-x-0.5"}`} /></button>
                      </div>
                    </div>
                  </div>

                  {/* Advanced */}
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="p-6 space-y-4">
                      <div>
                        <h4 className="text-[13px] font-semibold">Advanced</h4>
                        <p className="text-[12px] text-muted-foreground">Scrollback, word boundaries, and platform-specific terminal behaviors.</p>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="pr-4"><div className="text-[13px] font-medium">Scrollback Rows</div><div className="text-[12px] text-muted-foreground">Retained desktop terminal rows for new and open panes.</div></div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="inline-flex rounded-md border p-0.5 bg-muted">
                            {([5000,10000,25000,50000] as const).map(preset=> {
                              const isPreset = [5000,10000,25000,50000].includes(settings.terminal_scrollback_rows as any);
                              const active = scrollbackMode!=="custom" && isPreset && settings.terminal_scrollback_rows===preset;
                              const label = preset>=1000 ? `${preset/1000}k` : String(preset);
                              return <button key={preset} onClick={()=>{ setScrollbackMode("preset"); setSettingsLive({ ...settings, terminal_scrollback_rows: preset }); setScrollbackDraft(String(preset)); }} className={`px-2.5 py-1 text-[11px] rounded font-medium transition ${active ? "bg-foreground text-background shadow" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
                            })}
                            <button onClick={()=>setScrollbackMode("custom")} className={`px-2.5 py-1 text-[11px] rounded font-medium transition ${scrollbackMode==="custom" ? "bg-foreground text-background shadow" : "text-muted-foreground hover:text-foreground"}`}>Custom</button>
                          </div>
                          {scrollbackMode==="custom" && (
                            <div className="flex items-center gap-2">
                              <input type="number" min={1000} max={50000} step={100} value={scrollbackDraft} onChange={(e)=>setScrollbackDraft(e.target.value)} onBlur={()=>{ const v=Number(scrollbackDraft); if(Number.isFinite(v)){ const c=Math.min(50000,Math.max(1000,Math.floor(v))); setSettingsLive({ ...settings, terminal_scrollback_rows: c }); setScrollbackDraft(String(c)); } else setScrollbackDraft(String(settings.terminal_scrollback_rows)); }} onKeyDown={(e)=>{ if(e.key==="Enter"){ const v=Number(scrollbackDraft); if(Number.isFinite(v)){ const c=Math.min(50000,Math.max(1000,Math.floor(v))); setSettingsLive({ ...settings, terminal_scrollback_rows: c }); setScrollbackDraft(String(c)); }}}} className="w-24 bg-background border rounded-md px-2 py-1 text-[13px] tabular-nums" />
                              <span className="text-[11px] text-muted-foreground">rows</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between gap-4">
                        <div className="pr-4"><div className="text-[13px] font-medium">Word Separators</div><div className="text-[12px] text-muted-foreground">Characters treated as word boundaries for double-click selection.</div></div>
                        <input value={settings.terminal_word_separator ?? ""} onChange={(e)=>setSettingsLive({ ...settings, terminal_word_separator: e.target.value || undefined })} placeholder={` ()[]{},'"\``} className="w-56 bg-background border rounded-md px-3 py-2 font-mono text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Manage Sessions — Orca ManageSessionsSection faithful, simplified for Hydra daemon */}
                  <div className="rounded-xl border bg-card p-6 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-[13px] font-semibold">Manage Sessions</h4>
                      <p className="text-[12px] text-muted-foreground">Recover from a frozen or misbehaving terminal by killing sessions. Daemon `hydra.sock` survives UI restart.</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground">{terminalSessions.length} active session{terminalSessions.length!==1?"s":""} {terminalSessionsLoading ? "(refreshing…)" : ""}</span>
                      <button onClick={refreshTerminalSessions} className="px-3 py-1.5 rounded-md border bg-background text-[12px] hover:bg-muted">Refresh</button>
                    </div>
                    <div className="rounded-lg border divide-y max-h-[220px] overflow-y-auto">
                      {terminalSessions.length===0 ? (
                        <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">No active PTY sessions.</div>
                      ) : terminalSessions.map(sid=> (
                        <div key={sid} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50">
                          <span className="font-mono text-[12px] truncate pr-4">{sid}</span>
                          <button onClick={()=>{ invoke("delete_session_record", { sessionId: sid }).then(()=> refreshTerminalSessions()).catch(()=>{}); }} className="px-2.5 py-1 rounded-md border bg-background text-[11px] hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20">Kill</button>
                        </div>
                      ))}
                    </div>
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

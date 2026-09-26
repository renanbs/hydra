import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import {
  X, Search, ArrowLeft, AppWindow, TerminalSquare, Bot, Sliders, TextCursorInput, Keyboard, Shield, FolderGit2, Check, Trash2, Info, ChevronDown, RotateCcw
} from "lucide-react";
import { getOpenInAppPresets, isOpenInAppPresetAdded, OpenInApplicationIcon } from "../lib/open-in-app-catalog";
import type { OpenInApplication } from "../shared/settings-types";
import { DEFAULT_OPEN_IN_APPLICATIONS } from "../shared/settings-types";
import { applyDocumentTheme } from "../lib/document-theme";
import { getSystemPrefersDark } from "../lib/terminal-theme";
import { resolveEffectiveTerminalAppearance } from "../lib/terminal-theme";
import { DEFAULT_HYDRA_SETTINGS, normalizeHydraSettings, type HydraSettings } from "../shared/settings-types";
import { normalizeTerminalCustomThemes } from "../shared/terminal-custom-themes";
import { AppearancePane } from "./settings/AppearancePane";

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
// Inline picker delegated to fiel components: src/components/settings/TerminalThemePicker.tsx and TerminalSettingsPreview.tsx (Orca parity)

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
  const [ghosttyPreview, setGhosttyPreview] = useState<any>(null);
  const [ghosttyLoading, setGhosttyLoading] = useState(false);
  const [warpPreview, setWarpPreview] = useState<any>(null);
  const [warpLoading, setWarpLoading] = useState(false);
  const [importedHighlightSignal, setImportedHighlightSignal] = useState(0);
  const [typographyAdvancedOpen, setTypographyAdvancedOpen] = useState(false);
  const [colorOverridesExpanded, setColorOverridesExpanded] = useState(false);
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

  const refreshTerminalSessions = () => {
    setTerminalSessionsLoading(true);
    invoke<string[]>("list_terminal_sessions").then((list)=> setTerminalSessions(Array.isArray(list)? list : [])).catch(()=>{}).finally(()=> setTerminalSessionsLoading(false));
  };
  useEffect(() => {
    if (isOpen) {
      invoke<HydraSettings>("get_settings").then((s) => { if (s) { const n = normalizeHydraSettings(s); setSettings(n); setTerminalTarget(resolveEffectiveTerminalAppearance(n, getSystemPrefersDark()).mode); setScrollbackDraft(String(n.terminal_scrollback_rows)); setContrastDraft(n.terminal_minimum_contrast_ratio ?? 4.5); const isPreset=[5000,10000,25000,50000].includes(n.terminal_scrollback_rows as any); setScrollbackMode(isPreset ? "preset" : "custom"); }}).catch(console.error);
      refreshTerminalSessions();
      invoke<{ id: string; label: string }[]>("list_available_agents").then((a) => { if (Array.isArray(a)) setAvailableAgents(a.map((x: any) => ({ id: x.id ?? x.name ?? x, label: x.label ?? x.name ?? x}))); }).catch(()=>{});
      invoke<{ id: string; label: string; path: string }[]>("list_available_shells").then((s)=>{ if(Array.isArray(s)) setAvailableShells(s.map((x:any)=>({id:x.id, label:x.label, path:x.path}))); }).catch(()=>{});
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
  const persistSettings = (next: HydraSettings) => {
    setSettingsLive(next);
    invoke("save_settings", { settings: next }).catch(console.error);
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
  const handleGhosttyPreview = async () => {
    setGhosttyLoading(true); setImportError(null);
    try {
      const res: any = await invoke("preview_ghostty_import");
      setGhosttyPreview(res);
      if (!res.found) setImportError(res.error ?? "Ghostty config not found at ~/.config/ghostty/config");
    } catch (e: any) { setImportError(String(e)); }
    finally { setGhosttyLoading(false); }
  };
  const handleApplyGhostty = async () => {
    if (!ghosttyPreview?.found) return;
    const overrides = ghosttyPreview.diff?.terminalColorOverrides;
    if (overrides) {
      const merged = { ...(settings.terminal_color_overrides ?? {}), ...overrides };
      setSettingsLive({ ...settings, terminal_color_overrides: merged } as HydraSettings);
    }
    setGhosttyPreview(null);
  };
  const handleWarpPreview = async () => {
    setWarpLoading(true); setImportError(null);
    try {
      // Orca fiel: first try Warp YAML file picker (multi), then folder picker, then fallback to ~/.warp/themes
      const filePicked = await dialogOpen({ multiple: true, filters: [{ name: "Warp theme YAML", extensions: ["yaml", "yml"] }] } as any).catch(()=>null);
      if (Array.isArray(filePicked) && filePicked.length > 0) {
        const allThemes: any[] = [];
        const allSkipped: any[] = [];
        for (const fp of filePicked.slice(0, 200)) {
          const res: any = await invoke("preview_warp_themes", { path: fp });
          if (res.themes) allThemes.push(...res.themes);
          if (res.skippedFiles) allSkipped.push(...res.skippedFiles);
        }
        // Dedup ids — Orca uses content hash discriminator for manual picks
        const seen = new Set<string>();
        for (const t of allThemes) {
          let id = t.id as string;
          const base = id;
          let n = 1;
          while (seen.has(id)) { id = `${base}-${n++}`; }
          if (id !== (t.id as string)) { t.id = id; (t as any).selectionValue = `custom:${id}`; }
          seen.add(id);
        }
        const res = { found: allThemes.length > 0, sourceLabel: filePicked.length === 1 ? filePicked[0] : "Selected Warp themes", themes: allThemes.slice(0, 200), skippedFiles: allSkipped, error: allThemes.length === 0 ? "No valid Warp YAML found" : undefined };
        setWarpPreview(res);
        if (!res.found) setImportError(res.error ?? "No valid Warp YAML found");
        return;
      }
      if (typeof filePicked === "string" && filePicked) {
        const res: any = await invoke("preview_warp_themes", { path: filePicked });
        setWarpPreview(res);
        if (!res.found) setImportError(res.error ?? "No Warp themes found");
        return;
      }
      const folderPicked = await dialogOpen({ directory: true, multiple: false } as any).catch(()=>null);
      const pathArg = typeof folderPicked === "string" ? folderPicked : null;
      const res: any = await invoke("preview_warp_themes", { path: pathArg });
      setWarpPreview(res);
      if (!res.found) setImportError(res.error ?? "No Warp themes found");
    } catch (e: any) { setImportError(String(e)); }
    finally { setWarpLoading(false); }
  };
  const handleApplyWarpThemes = (selectedIds: string[]) => {
    if (!warpPreview?.themes) return;
    const toAdd = warpPreview.themes.filter((t: any) => selectedIds.includes(t.id));
    if (toAdd.length===0) return;
    const next = [...normalizeTerminalCustomThemes(settings.terminal_custom_themes), ...toAdd].slice(-200);
    setSettingsLive({ ...settings, terminal_custom_themes: next });
    setWarpPreview(null);
    setImportedHighlightSignal((s) => s + 1);
  };

  // target handled fiel inside TerminalThemeCatalogSection (Orca parity)
  void terminalTarget;

  // Groups: Orca-lite coherent (Setup → Interface → Workspace → Capabilities → Privacy) — dedup workspace_dir, unificado Terminal
  const navGroups: { id: string; title: string; items: { id: HydraNavId; label: string; icon: any; badge?: string }[] }[] = [
    { id: "setup", title: "Setup", items: [
      { id: "general", label: "General", icon: Sliders },
    ]},
    { id: "interface", title: "Interface", items: [
      { id: "appearance", label: "Appearance", icon: AppWindow },
      { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
    ]},
    { id: "workspace", title: "Workspace", items: [
      { id: "git", label: "Workspace & Git", icon: FolderGit2 },
      { id: "terminal", label: "Terminal", icon: TerminalSquare },
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
              {activeId==="general" && <><Sliders className="size-4 text-emerald-500" /> General</>}
              {activeId==="appearance" && <><AppWindow className="size-4 text-purple-500" /> Appearance</>}
              {activeId==="agents" && <><Bot className="size-4 text-emerald-500" /> Agents</>}
              {activeId==="input" && <><TextCursorInput className="size-4 text-blue-500" /> Input</>}
              {activeId==="shortcuts" && <><Keyboard className="size-4 text-amber-500" /> Shortcuts</>}
              {activeId==="security" && <><Shield className="size-4 text-red-500" /> Security & Gate</>}
              {activeId==="git" && <><FolderGit2 className="size-4" /> Workspace & Git</>}
              {activeId==="terminal" && <><TerminalSquare className="size-4 text-emerald-500" /> Terminal</>}
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
                            value={(settings as any).ctrl_tab_order_mode ?? "mru"}
                            onChange={(e)=> setSettingsLive({ ...settings, ctrl_tab_order_mode: e.target.value as any })}
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
                          aria-checked={Boolean((settings as any).confirm_close_pinned_tab ?? true)}
                          onClick={()=> setSettingsLive({ ...settings, confirm_close_pinned_tab: !((settings as any).confirm_close_pinned_tab ?? true)} as any)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${((settings as any).confirm_close_pinned_tab ?? true) ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${((settings as any).confirm_close_pinned_tab ?? true) ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Workspace Directory — Orca Settings → General */}
                  <div className="rounded-xl border bg-card p-6 space-y-3">
                    <h4 className="text-[13px] font-semibold">Workspace Directory</h4>
                    <div className="flex gap-2">
                      <input
                        value={settings.workspace_dir}
                        onChange={(e)=> persistSettings({ ...settings, workspace_dir: e.target.value })}
                        placeholder="/home/renan/orca/workspaces"
                        className="flex-1 bg-background border rounded-md px-3 py-2 font-mono text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={async ()=>{
                          try {
                            const picked = await dialogOpen({ directory: true, multiple: false });
                            if (typeof picked === "string" && picked) persistSettings({ ...settings, workspace_dir: picked });
                          } catch {}
                        }}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md border bg-background text-[13px] hover:bg-muted"
                      >
                        <FolderGit2 className="size-3.5" /> Browse
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Root directory where workspace folders are created. Relative (e.g. .orca/worktrees) for per-project, or absolute for a shared folder. Hydra uses this path — not a hardcoded orca/workspaces — to discover worktrees.</p>
                  </div>

                  {/* Sources — Orca Settings → General */}
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
                          persistSettings({ ...settings, worktree_visibility_defaults: { ...cur, sourcePreferences: nextPrefs } } as any);
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
                          persistSettings({ ...settings, worktree_visibility_defaults: { ...cur, external: next } } as any);
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
                                persistSettings({ ...settings, worktree_visibility_defaults: { ...cur, customSources: next } } as any);
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
                              persistSettings({ ...settings, worktree_visibility_defaults: { ...cur, customSources: next } } as any);
                              setWorktreeRootDraft("");
                            }}
                            className="px-4 py-2 rounded-md bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90"
                          >Add</button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Hydra will recognize worktrees beneath this folder.</p>
                        {(((settings as any).worktree_visibility_defaults?.customSources ?? []) as Array<{id:string;rootPath:string}>).length>0 && (
                          <div className="space-y-1 pt-2">
                            {((settings as any).worktree_visibility_defaults.customSources as Array<{id:string;rootPath:string}>).map((cs)=>(
                              <div key={cs.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border bg-muted/20 text-[12px]">
                                <span className="truncate font-mono">{cs.rootPath}</span>
                                <button
                                  onClick={()=>{
                                    const cur = (settings as any).worktree_visibility_defaults ?? { external: "hide", customSources: [], sourcePreferences: { builtIn: {}, custom: {} } };
                                    const next = (cur.customSources ?? []).filter((x: {id:string})=> x.id!==cs.id);
                                    persistSettings({ ...settings, worktree_visibility_defaults: { ...cur, customSources: next } } as any);
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

                </div>
              )}
              {activeId==="appearance" && (
                <AppearancePane
                  settings={settings}
                  updateSettings={(u) => setSettingsLive({ ...settings, ...u } as any)}
                  previewTerminalFont={previewTerminalFont}
                  setPreviewTerminalFont={setPreviewTerminalFont}
                  previewAppFont={previewAppFont}
                  setPreviewAppFont={setPreviewAppFont}
                  terminalFontSuggestions={terminalFontSuggestions}
                  themeSearch={themeSearch}
                  setThemeSearch={setThemeSearch}
                  importedHighlightSignal={importedHighlightSignal}
                  onGhostty={handleGhosttyPreview}
                  onWarp={handleWarpPreview}
                  ghosttyLoading={ghosttyLoading}
                  warpLoading={warpLoading}
                  ghosttyPreview={ghosttyPreview}
                  warpPreview={warpPreview}
                  importError={importError}
                  handleImportCustomTheme={handleImportCustomTheme}
                  handleApplyGhostty={handleApplyGhostty}
                  handleApplyWarpThemes={handleApplyWarpThemes}
                  setGhosttyPreview={setGhosttyPreview}
                  setWarpPreview={setWarpPreview}
                  typographyAdvancedOpen={typographyAdvancedOpen}
                  setTypographyAdvancedOpen={setTypographyAdvancedOpen}
                  colorOverridesExpanded={colorOverridesExpanded}
                  setColorOverridesExpanded={setColorOverridesExpanded}
                />
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
                    <p className="text-[13px] text-muted-foreground">Git defaults, nesting, and Open In apps. Workspace Directory and Sources live in Setup → General (Orca: Settings → General).</p>
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
                    <h3 className="text-[20px] font-semibold tracking-tight">Terminal</h3>
                    <p className="text-[13px] text-muted-foreground">Typography, themes, renderer and behavior — unified from Appearance (Orca: Workflows → Terminal).</p>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3 text-[12px] text-muted-foreground">Typography moved to <span className="font-medium text-foreground">Appearance → Terminal</span> — Orca faithful.</div>

                  <div className="rounded-lg border bg-muted/30 p-3 text-[12px] text-muted-foreground">Terminal themes moved to <span className="font-medium text-foreground">Appearance → Terminal</span> — Orca faithful. Use Appearance to change themes.</div>

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
                      <button onClick={()=>invoke<{id:string;label:string;path:string}[]>("list_available_shells").then((s:any)=>setAvailableShells(s.map((x:any)=>({id:x.id,label:x.label,path:x.path})))).catch(()=>{})} className="px-3 py-2 rounded-md border bg-background text-[12px] hover:bg-muted">Refresh</button>
                    </div>
                    <div className="flex gap-2">
                      <input value={settings.terminal_default_shell} onChange={(e)=>setSettingsLive({ ...settings, terminal_default_shell: e.target.value })} placeholder="Custom shell (e.g. /usr/bin/zsh)" className="flex-1 bg-background border border-input rounded-md px-3 py-2 font-mono text-[12px] focus:outline-none focus:ring-2 focus:ring-ring" />
                      <span className="text-[11px] text-muted-foreground self-center">Current: {settings.terminal_default_shell || "bash"} · {availableShells.length} found</span>
                    </div>
                  </section>

                  <div className="rounded-lg border bg-muted/30 p-3 text-[12px] text-muted-foreground">Cursor, Panes and Window moved to <span className="font-medium text-foreground">Appearance → Terminal</span> — Orca faithful (advancedContent inside theme preview).</div>

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

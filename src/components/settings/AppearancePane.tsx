import { useState } from "react";
import { AppWindow, TerminalSquare, PanelLeft, Upload } from "lucide-react";
import type { HydraSettings } from "../../shared/settings-types";
import { AppearanceSection } from "./AppearanceSection";
import { FontAutocomplete } from "./FontAutocomplete";
import { TerminalThemeCatalogSection } from "./TerminalThemeSections";

type Props = {
  settings: HydraSettings;
  updateSettings: (u: Partial<HydraSettings>) => void;
  previewTerminalFont: string | null;
  setPreviewTerminalFont: (v: string | null) => void;
  previewAppFont: string | null;
  setPreviewAppFont: (v: string | null) => void;
  terminalFontSuggestions: string[];
  themeSearch: string;
  setThemeSearch: (v: string) => void;
  importedHighlightSignal: number;
  onGhostty: () => void;
  onWarp: () => void;
  ghosttyLoading: boolean;
  warpLoading: boolean;
  ghosttyPreview: any;
  warpPreview: any;
  importError: string | null;
  handleImportCustomTheme: () => void;
  handleApplyGhostty: () => void;
  handleApplyWarpThemes: (ids: string[]) => void;
  setGhosttyPreview: (v: any) => void;
  setWarpPreview: (v: any) => void;
  typographyAdvancedOpen: boolean;
  setTypographyAdvancedOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  colorOverridesExpanded: boolean;
  setColorOverridesExpanded: (v: boolean | ((p: boolean) => boolean)) => void;
};

export function AppearancePane({ settings, updateSettings, previewTerminalFont, setPreviewTerminalFont, previewAppFont, setPreviewAppFont, terminalFontSuggestions, themeSearch, setThemeSearch, importedHighlightSignal, onGhostty, onWarp, ghosttyLoading, warpLoading, ghosttyPreview, warpPreview, importError, handleImportCustomTheme, handleApplyGhostty, handleApplyWarpThemes, setGhosttyPreview, setWarpPreview, typographyAdvancedOpen, setTypographyAdvancedOpen, colorOverridesExpanded, setColorOverridesExpanded }: Props) {
  const [open, setOpen] = useState<Set<"interface" | "terminal" | "window">>(() => new Set(["interface", "terminal", "window"]));
  const toggle = (k: "interface" | "terminal" | "window") => setOpen((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const [terminalAdvancedOpen, setTerminalAdvancedOpen] = useState(false);

  const interfaceSummary = `${settings.theme} · ${settings.app_font_family.split(",")[0]}`;
  const terminalSummary = `${settings.terminal_font_family.split(",")[0]} · ${settings.terminal_font_size}px`;
  const windowSummary = `${settings.left_sidebar_appearance_mode === "tinted" ? "Tinted" : "Default"} · ${settings.editor_font_family ? "Editor custom" : "Editor follows terminal"}`;

  return (
    <div className="space-y-2.5">
      <AppearanceSection id="interface" icon={<AppWindow />} title="Interface" summary={interfaceSummary} open={open.has("interface")} onToggle={() => toggle("interface")}>
        <div className="divide-y divide-border/40">
          <div className="py-3">
            <div className="text-[13px] font-medium mb-2">Theme</div>
            <p className="text-xs text-muted-foreground mb-2">system respects prefers-color-scheme</p>
            <div className="inline-flex rounded-lg border bg-muted p-1">
              {(["system", "dark", "light"] as const).map((v) => (
                <button key={v} onClick={() => updateSettings({ theme: v } as any)} className={`px-3 py-1.5 text-[12px] rounded-md font-medium transition ${settings.theme === v ? "bg-background shadow text-foreground border" : "text-muted-foreground hover:text-foreground"}`}>{v}</button>
              ))}
            </div>
          </div>
          <div className="py-3">
            <div className="text-[13px] font-medium mb-2">IDE Font</div>
            <p className="text-xs text-muted-foreground mb-2">Interface typeface for sidebar, titlebar and panels. Preview updates live.</p>
            <FontAutocomplete value={previewAppFont ?? settings.app_font_family} suggestions={["Geist", "Inter", "SF Pro Text"]} placeholder="Geist" onPreviewFontFamily={setPreviewAppFont} onChange={(v) => updateSettings({ app_font_family: v.trim() || "Geist, sans-serif" } as any)} />
            <div className="text-[11px] text-muted-foreground mt-1" style={{ fontFamily: previewAppFont ?? settings.app_font_family }}>Preview: The quick brown fox — 1234567890</div>
          </div>
        </div>
      </AppearanceSection>

      <AppearanceSection id="terminal" icon={<TerminalSquare />} title="Terminal" summary={terminalSummary} open={open.has("terminal")} onToggle={() => toggle("terminal")}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-[13px] font-semibold">Typography</h3>
              <p className="text-[12px] text-muted-foreground">Font Family and Size — Advanced has Weight/Bold/LineHeight/Ligatures</p>
            </div>
            <button onClick={handleImportCustomTheme} className="px-3 py-1.5 rounded-md border bg-background text-[12px] hover:bg-muted flex items-center gap-1.5">Import JSON/YAML</button>
          </div>
          {ghosttyPreview && (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="text-[12px] font-medium">Ghostty Import {ghosttyPreview.found ? `— ${ghosttyPreview.configPath}` : "— not found"}</div>
              {ghosttyPreview.found ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-muted-foreground">Found {Object.keys(ghosttyPreview.diff?.terminalColorOverrides ?? {}).length} overrides. Unsupported: {ghosttyPreview.unsupportedKeys?.join(", ") || "none"}</div>
                  <div className="flex gap-2"><button onClick={handleApplyGhostty} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-[12px]">Apply</button><button onClick={() => setGhosttyPreview(null)} className="px-3 py-1.5 rounded-md border bg-background text-[12px]">Dismiss</button></div>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground">{ghosttyPreview.error ?? "No config"}</div>
              )}
            </div>
          )}
          {warpPreview && (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="text-[12px] font-medium">Warp Import — {warpPreview.sourceLabel} — {warpPreview.themes?.length ?? 0} themes</div>
              {warpPreview.themes?.length > 0 ? (
                <div className="space-y-2">
                  <div className="max-h-[160px] overflow-y-auto divide-y rounded border bg-background">
                    {warpPreview.themes.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 text-[12px]"><span className="w-3 h-3 rounded border" style={{ background: t.terminal.background }} /><span className="flex-1 truncate">{t.name}</span><span className="text-[10px] text-muted-foreground">{t.mode}</span></div>
                    ))}
                  </div>
                  <div className="flex gap-2"><button onClick={() => handleApplyWarpThemes(warpPreview.themes.map((t: any) => t.id))} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-[12px]">Import All ({warpPreview.themes.length})</button><button onClick={() => setWarpPreview(null)} className="px-3 py-1.5 rounded-md border bg-background text-[12px]">Dismiss</button></div>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground">{warpPreview.error ?? "No YAML"}</div>
              )}
            </div>
          )}
          {importError && <div className="text-[12px] text-destructive">{importError}</div>}
          <div className="ml-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold">Typography</h3>
              <button onClick={handleImportCustomTheme} className="px-3 py-1.5 rounded-md border bg-background text-[12px] hover:bg-muted flex items-center gap-1.5"><Upload className="size-3.5" /> Import JSON/YAML</button>
            </div>
            <div className="space-y-3">
              <div className="text-[12px] font-medium">Font Family</div>
              <FontAutocomplete value={previewTerminalFont ?? settings.terminal_font_family} suggestions={terminalFontSuggestions} placeholder="JetBrains Mono" onPreviewFontFamily={setPreviewTerminalFont} onChange={(v) => updateSettings({ terminal_font_family: v } as any)} />
              <div className="text-[11px] text-muted-foreground font-mono" style={{ fontFamily: previewTerminalFont ?? settings.terminal_font_family }}>Preview: hydra --help — 0123456789 — ligatures fi fl</div>
            </div>
            <div><label className="block text-[12px] font-medium mb-1.5">Font Size (px)</label><input type="number" min={8} max={32} value={settings.terminal_font_size} onChange={(e) => updateSettings({ terminal_font_size: Number(e.target.value) } as any)} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
            <div className="border-t border-border/50 pt-2">
              <button type="button" onClick={() => setTypographyAdvancedOpen((v) => !v)} className="flex w-full items-center gap-2 py-1 text-sm font-semibold">Advanced</button>
              {typographyAdvancedOpen && (
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div><label className="block text-[12px] font-medium mb-1.5">Weight</label><input type="number" min={100} max={900} step={100} value={settings.terminal_font_weight} onChange={(e) => updateSettings({ terminal_font_weight: Number(e.target.value) } as any)} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                  <div><label className="block text-[12px] font-medium mb-1.5">Weight Bold</label><input type="number" min={100} max={900} step={100} value={settings.terminal_font_weight_bold} onChange={(e) => updateSettings({ terminal_font_weight_bold: Number(e.target.value) } as any)} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                  <div><label className="block text-[12px] font-medium mb-1.5">Line Height</label><input type="number" min={1} max={3} step={0.1} value={settings.terminal_line_height} onChange={(e) => updateSettings({ terminal_line_height: Number(e.target.value) } as any)} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-medium mb-1.5">Font Ligatures</label>
                    <div className="inline-flex rounded-lg border bg-muted p-1">
                      {(["auto", "on", "off"] as const).map((v) => (
                        <button key={v} onClick={() => updateSettings({ terminal_ligatures: v } as any)} className={`px-3 py-1.5 text-[12px] rounded-md font-medium transition ${settings.terminal_ligatures === v ? "bg-background shadow text-foreground border" : "text-muted-foreground hover:text-foreground"}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <TerminalThemeCatalogSection settings={settings} themeSearch={themeSearch} setThemeSearch={setThemeSearch} updateSettings={updateSettings as any} previewFontFamily={previewTerminalFont} importedHighlightSignal={importedHighlightSignal} showImport onGhostty={onGhostty} onWarp={onWarp} ghosttyLoading={ghosttyLoading} warpLoading={warpLoading} advancedContent={
            <div className="space-y-4">
              <div className="border-t border-border/50 pt-2">
                <button type="button" onClick={() => setTerminalAdvancedOpen((v) => !v)} className="flex w-full items-center gap-2 py-1 text-sm font-semibold">
                  <span className={`size-3.5 text-muted-foreground transition-transform ${terminalAdvancedOpen ? "rotate-90" : ""}`}>▶</span>
                  Advanced
                </button>
                {terminalAdvancedOpen && <div className="mt-2 space-y-4">
              <div className="border-t border-border/50 pt-4 space-y-4">
                <h4 className="text-[12px] font-semibold">Cursor</h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-[12px] font-medium mb-1.5">Cursor Shape</div>
                    <div className="inline-flex rounded-lg border bg-muted p-1">
                      {(["bar", "block", "underline"] as const).map((v) => (
                        <button key={v} onClick={() => updateSettings({ terminal_cursor_style: v } as any)} className={`px-3 py-1.5 text-[12px] rounded-md font-medium transition ${settings.terminal_cursor_style === v ? "bg-background shadow text-foreground border" : "text-muted-foreground hover:text-foreground"}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center justify-between gap-4">
                    <div><div className="text-[13px] font-medium">Blinking Cursor</div><div className="text-[12px] text-muted-foreground">Uses the blinking variant.</div></div>
                    <button type="button" role="switch" aria-checked={settings.terminal_cursor_blink} onClick={() => updateSettings({ terminal_cursor_blink: !settings.terminal_cursor_blink } as any)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${settings.terminal_cursor_blink ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${settings.terminal_cursor_blink ? "translate-x-4" : "translate-x-0.5"}`} /></button>
                  </label>
                  <div><label className="block text-[12px] font-medium mb-1.5">Cursor Opacity</label><input type="number" min={0} max={1} step={0.05} value={(settings as any).terminal_cursor_opacity ?? 1} onChange={(e) => updateSettings({ terminal_cursor_opacity: Math.min(1, Math.max(0, Number(e.target.value))) } as any)} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                </div>
              </div>
              <div className="border-t border-border/50 pt-4 space-y-4">
                <h4 className="text-[12px] font-semibold">Panes</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[12px] font-medium mb-1.5">Inactive Pane Opacity</label><input type="number" min={0} max={1} step={0.05} value={settings.terminal_inactive_pane_opacity} onChange={(e) => updateSettings({ terminal_inactive_pane_opacity: Math.min(1, Math.max(0, Number(e.target.value))) } as any)} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                  <div><label className="block text-[12px] font-medium mb-1.5">Divider Thickness</label><input type="number" min={1} max={32} value={settings.terminal_divider_thickness_px} onChange={(e) => updateSettings({ terminal_divider_thickness_px: Math.min(32, Math.max(1, Number(e.target.value))) } as any)} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                </div>
              </div>
              <div className="border-t border-border/50 pt-4 space-y-4">
                <h4 className="text-[12px] font-semibold">Window</h4>
                <div className="space-y-3">
                  <div><label className="block text-[12px] font-medium mb-1.5">Background Opacity</label><input type="number" min={0} max={1} step={0.05} value={settings.terminal_background_opacity ?? 1} onChange={(e) => updateSettings({ terminal_background_opacity: Math.min(1, Math.max(0, Number(e.target.value))) } as any)} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                  <label className="flex items-center justify-between gap-4"><div><div className="text-[13px] font-medium">Window Blur</div><div className="text-[12px] text-muted-foreground">Requires restart.</div></div><button type="button" role="switch" aria-checked={Boolean((settings as any).window_background_blur)} onClick={() => updateSettings({ window_background_blur: !(settings as any).window_background_blur } as any)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${Boolean((settings as any).window_background_blur) ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${Boolean((settings as any).window_background_blur) ? "translate-x-4" : "translate-x-0.5"}`} /></button></label>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[12px] font-medium mb-1.5">Horizontal Padding</label><input type="number" min={0} max={512} value={(settings as any).terminal_padding_x ?? 4} onChange={(e) => updateSettings({ terminal_padding_x: Math.max(0, Number(e.target.value)) } as any)} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                    <div><label className="block text-[12px] font-medium mb-1.5">Vertical Padding</label><input type="number" min={0} max={512} value={(settings as any).terminal_padding_y ?? 4} onChange={(e) => updateSettings({ terminal_padding_y: Math.max(0, Number(e.target.value)) } as any)} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
                  </div>
                  <label className="flex items-center justify-between gap-4"><div><div className="text-[13px] font-medium">Hide Mouse While Typing</div></div><button type="button" role="switch" aria-checked={Boolean((settings as any).terminal_mouse_hide_while_typing)} onClick={() => updateSettings({ terminal_mouse_hide_while_typing: !(settings as any).terminal_mouse_hide_while_typing } as any)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${Boolean((settings as any).terminal_mouse_hide_while_typing) ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${Boolean((settings as any).terminal_mouse_hide_while_typing) ? "translate-x-4" : "translate-x-0.5"}`} /></button></label>
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] font-medium">Color Overrides</div>
                      <button type="button" onClick={() => setColorOverridesExpanded((v) => !v)} className="text-xs flex items-center gap-1">{colorOverridesExpanded ? "Hide" : "Show"}</button>
                    </div>
                    {colorOverridesExpanded && (
                      <div className="mt-3 space-y-4">
                        {[
                          {label:"Base", keys:["foreground","background","cursor","cursorAccent","selectionBackground","selectionForeground","bold"]},
                          {label:"ANSI Normal", keys:["black","red","green","yellow","blue","magenta","cyan","white"]},
                          {label:"ANSI Bright", keys:["brightBlack","brightRed","brightGreen","brightYellow","brightBlue","brightMagenta","brightCyan","brightWhite"]},
                        ].map((group)=>(
                          <div key={group.label} className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground">{group.label}</div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {group.keys.map((k)=>(
                                <div key={k}>
                                  <label className="block text-[11px] font-medium mb-1">{k}</label>
                                  <div className="flex gap-1">
                                    <input type="color" value={(settings.terminal_color_overrides as any)?.[k] ?? "#000000"} onChange={(e) => updateSettings({ terminal_color_overrides: { ...(settings.terminal_color_overrides ?? {}), [k]: e.target.value } } as any)} className="h-8 w-8 rounded border p-0.5" />
                                    <input value={(settings.terminal_color_overrides as any)?.[k] ?? ""} placeholder="hex" onChange={(e) => updateSettings({ terminal_color_overrides: { ...(settings.terminal_color_overrides ?? {}), [k]: e.target.value || undefined } } as any)} className="flex-1 bg-background border rounded-md px-2 py-1 font-mono text-xs" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <button onClick={() => updateSettings({ terminal_color_overrides: undefined } as any)} className="px-3 py-1.5 rounded-md border bg-background text-xs">Reset all color overrides</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
                </div>
                }
              </div>
            </div>
          } />
        </div>
      </AppearanceSection>

      <AppearanceSection id="window" icon={<PanelLeft />} title="Window & Sidebar" summary={windowSummary} open={open.has("window")} onToggle={() => toggle("window")}>
        <div className="divide-y divide-border/40">
          <div className="py-3">
            <div className="text-[13px] font-medium mb-2">Left Sidebar Appearance</div>
            <div className="inline-flex rounded-lg border bg-muted p-1">
              {(["default", "tinted"] as const).map((v) => (
                <button key={v} onClick={() => updateSettings({ left_sidebar_appearance_mode: v } as any)} className={`px-3 py-1.5 text-[12px] rounded-md font-medium transition ${((settings as any).left_sidebar_appearance_mode ?? "default") === v ? "bg-background shadow text-foreground border" : "text-muted-foreground hover:text-foreground"}`}>{v}</button>
              ))}
            </div>
            {(settings as any).left_sidebar_appearance_mode === "tinted" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium mb-1.5">Tint Color</label><div className="flex gap-2"><input type="color" value={(settings as any).left_sidebar_tint_color ?? "#121316"} onChange={(e) => updateSettings({ left_sidebar_tint_color: e.target.value } as any)} className="h-9 w-9 rounded border p-1" /><input value={(settings as any).left_sidebar_tint_color ?? ""} onChange={(e) => updateSettings({ left_sidebar_tint_color: e.target.value || undefined } as any)} placeholder="#121316" className="flex-1 bg-background border rounded-md px-3 py-2 font-mono text-[12px]" /></div></div>
                <div><label className="block text-[12px] font-medium mb-1.5">Tint Opacity</label><input type="number" min={0} max={1} step={0.05} value={(settings as any).left_sidebar_tint_opacity ?? 0.5} onChange={(e) => updateSettings({ left_sidebar_tint_opacity: Number(e.target.value) } as any)} className="w-full bg-background border rounded-md px-3 py-2 text-[13px]" /></div>
              </div>
            )}
          </div>
          <div className="py-3">
            <div className="text-[13px] font-medium mb-2">Editor</div>
            <p className="text-xs text-muted-foreground mb-2">Monaco diff/editor — empty follows terminal font.</p>
            <div><label className="block text-[12px] font-medium mb-1.5">Editor Font Family (optional)</label><input value={(settings as any).editor_font_family ?? ""} onChange={(e) => updateSettings({ editor_font_family: e.target.value || undefined } as any)} placeholder="Follows terminal font" className="w-full bg-background border rounded-md px-3 py-2 font-mono text-[12px]" /></div>
            <div className="mt-3 flex gap-4">
              <label className="flex items-center gap-2 text-[12px]">Minimap<button type="button" role="switch" aria-checked={(settings as any).editor_minimap_enabled !== false} onClick={() => updateSettings({ editor_minimap_enabled: !((settings as any).editor_minimap_enabled !== false) } as any)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${(settings as any).editor_minimap_enabled !== false ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${(settings as any).editor_minimap_enabled !== false ? "translate-x-4" : "translate-x-0.5"}`} /></button></label>
              <label className="flex items-center gap-2 text-[12px]">Word Wrap<button type="button" role="switch" aria-checked={(settings as any).editor_word_wrap !== false} onClick={() => updateSettings({ editor_word_wrap: !((settings as any).editor_word_wrap !== false) } as any)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${(settings as any).editor_word_wrap !== false ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${(settings as any).editor_word_wrap !== false ? "translate-x-4" : "translate-x-0.5"}`} /></button></label>
            </div>
          </div>
          <div className="py-3">
            <div className="text-[13px] font-medium mb-2">Status Bar</div>
            <p className="text-xs text-muted-foreground mb-2">Choose which indicators appear in the status bar.</p>
            <div className="space-y-3">
              <div>
                <div className="text-[12px] font-medium mb-1.5">Usage Percentage</div>
                <div className="inline-flex rounded-lg border bg-muted p-1">
                  {(["used","remaining"] as const).map((v) => (
                    <button key={v} onClick={() => updateSettings({ usage_percentage_display: v } as any)} className={`px-3 py-1.5 text-[12px] rounded-md font-medium transition ${((settings as any).usage_percentage_display ?? "used") === v ? "bg-background shadow text-foreground border" : "text-muted-foreground hover:text-foreground"}`}>{v}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {["resource-usage","ports","ssh","claude","codex","gemini","opencode-go","kimi","antigravity","minimax","grok"].map((id) => {
                  const enabled = (settings.status_bar_items ?? []).includes(id);
                  return (
                    <label key={id} className="flex items-center justify-between gap-4">
                      <span className="text-[12px]">{id}</span>
                      <button type="button" role="switch" aria-checked={enabled} onClick={() => {
                        const cur = new Set(settings.status_bar_items ?? []);
                        if (enabled) cur.delete(id); else cur.add(id);
                        updateSettings({ status_bar_items: Array.from(cur) } as any);
                      }} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${enabled ? "bg-foreground border-foreground" : "bg-input border-transparent"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} /></button>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </AppearanceSection>
    </div>
  );
}

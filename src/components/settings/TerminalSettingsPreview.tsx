import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { LigaturesAddon } from "@xterm/addon-ligatures";
import "@xterm/xterm/css/xterm.css";
import { buildDefaultTerminalOptions } from "../../lib/pane-manager/pane-terminal-options";
import { buildFontFamily } from "../terminal-pane/layout-serialization";
import { composeActiveTerminalTheme } from "../terminal-pane/terminal-appearance";
import { clampNumber, resolveEffectiveTerminalAppearance } from "../../lib/terminal-theme";
import { resolveTerminalMinimumContrastRatio } from "../../lib/terminal-contrast-correction";
import { resolveTerminalFontWeights } from "../../shared/terminal-fonts";
import { resolveTerminalLigaturesEnabled } from "../../shared/terminal-ligatures";
import { normalizeTerminalLineHeight } from "../../shared/terminal-line-height-settings";
import { PREVIEW_BUFFER } from "./terminal-preview-content";
import type { HydraSettings } from "../../shared/settings-types";
import type { ITheme } from "@xterm/xterm";

const PREVIEW_COLS = 36;
const PREVIEW_ROWS = 15;
const STUB_PANE_PX = 40;

type PreviewMode = "dark" | "light";
type Props = {
  title: string;
  description?: string;
  settings: HydraSettings;
  systemPrefersDark?: boolean;
  previewFontFamily?: string | null;
  modeOverride?: PreviewMode;
  showThemeToggle?: boolean;
};

function resolveAppMode(settings: Pick<HydraSettings, "theme">, systemPrefersDark: boolean): PreviewMode {
  if (settings.theme === "system") return systemPrefersDark ? "dark" : "light";
  return settings.theme as PreviewMode;
}

export function TerminalSettingsPreview({ title, description, settings, systemPrefersDark: sysDarkProp, previewFontFamily, modeOverride, showThemeToggle }: Props) {
  const sysDark = sysDarkProp ?? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const ligaturesAddonRef = useRef<LigaturesAddon | null>(null);
  const skipInitialOptionMutationRef = useRef(false);
  const skipInitialThemeRewriteRef = useRef(false);

  const effectiveFontFamily = previewFontFamily || settings.terminal_font_family;
  const terminalLineHeight = normalizeTerminalLineHeight(settings.terminal_line_height);

  const [toggleMode, setToggleMode] = useState<PreviewMode>(() => resolveAppMode(settings, sysDark));
  const [dividerVisible, setDividerVisible] = useState(false);
  const effectiveMode: PreviewMode = modeOverride ?? (showThemeToggle ? toggleMode : resolveAppMode(settings, sysDark));

  const appearance = useMemo(() => resolveEffectiveTerminalAppearance({ ...settings, theme: effectiveMode } as HydraSettings, sysDark), [effectiveMode, settings.terminal_theme_dark, settings.terminal_theme_light, settings.terminal_custom_themes, settings.terminal_use_separate_light_theme, settings.terminal_divider_color_dark, settings.terminal_divider_color_light, sysDark]);

  const composedTheme = useMemo(() => composeActiveTerminalTheme(appearance.theme as ITheme | null, settings), [appearance, settings.terminal_color_overrides, settings.terminal_background_opacity, settings.terminal_cursor_opacity]);

  const dividerThickness = clampNumber(settings.terminal_divider_thickness_px ?? 3, 1, 32);
  const inactiveOpacity = clampNumber(settings.terminal_inactive_pane_opacity ?? 0.6, 0, 1);
  const paneBackground = composedTheme?.background ?? "#000";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const weights = resolveTerminalFontWeights(settings.terminal_font_weight, settings.terminal_font_weight_bold);
    skipInitialOptionMutationRef.current = true;
    skipInitialThemeRewriteRef.current = true;
    const terminal = new Terminal({
      ...buildDefaultTerminalOptions(),
      disableStdin: true,
      cursorInactiveStyle: settings.terminal_cursor_style as any,
      cursorStyle: settings.terminal_cursor_style as any,
      cursorBlink: settings.terminal_cursor_blink,
      fontSize: settings.terminal_font_size,
      fontFamily: buildFontFamily(effectiveFontFamily),
      fontWeight: String(weights.fontWeight) as any,
      fontWeightBold: String(weights.fontWeightBold) as any,
      lineHeight: terminalLineHeight,
      theme: composedTheme ?? undefined,
      allowTransparency: settings.terminal_background_opacity !== undefined && settings.terminal_background_opacity < 1,
      cols: PREVIEW_COLS,
      rows: PREVIEW_ROWS,
    });
    termRef.current = terminal;
    try { terminal.open(container); terminal.write(PREVIEW_BUFFER); } catch (err) { termRef.current = null; terminal.dispose(); throw err; }
    return () => { ligaturesAddonRef.current?.dispose(); ligaturesAddonRef.current = null; terminal.dispose(); termRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const terminal = termRef.current;
    if (!terminal) return;
    if (skipInitialOptionMutationRef.current) { skipInitialOptionMutationRef.current = false; return; }
    const weights = resolveTerminalFontWeights(settings.terminal_font_weight, settings.terminal_font_weight_bold);
    terminal.options.fontSize = settings.terminal_font_size;
    terminal.options.fontFamily = buildFontFamily(effectiveFontFamily);
    (terminal.options as any).fontWeight = String(weights.fontWeight);
    (terminal.options as any).fontWeightBold = String(weights.fontWeightBold);
    terminal.options.lineHeight = terminalLineHeight;
    (terminal.options as any).cursorStyle = settings.terminal_cursor_style;
    (terminal.options as any).cursorInactiveStyle = settings.terminal_cursor_style;
    terminal.options.cursorBlink = settings.terminal_cursor_blink;
  }, [settings.terminal_font_size, settings.terminal_font_weight_bold, effectiveFontFamily, settings.terminal_font_weight, terminalLineHeight, settings.terminal_cursor_style, settings.terminal_cursor_blink]);

  useEffect(() => {
    const terminal = termRef.current;
    if (!terminal || !composedTheme) return;
    terminal.options.theme = composedTheme;
    (terminal.options as any).minimumContrastRatio = resolveTerminalMinimumContrastRatio(composedTheme.background as string | undefined, effectiveMode, settings.terminal_minimum_contrast_ratio);
    (terminal.options as any).allowTransparency = settings.terminal_background_opacity !== undefined && settings.terminal_background_opacity < 1;
    if (skipInitialThemeRewriteRef.current) { skipInitialThemeRewriteRef.current = false; return; }
    terminal.reset();
    terminal.write(PREVIEW_BUFFER);
  }, [composedTheme, effectiveMode, settings.terminal_background_opacity, settings.terminal_minimum_contrast_ratio]);

  useEffect(() => {
    const terminal = termRef.current;
    if (!terminal) return;
    const enabled = resolveTerminalLigaturesEnabled(settings.terminal_ligatures as any, effectiveFontFamily);
    const current = ligaturesAddonRef.current;
    if (enabled && !current) {
      const addon = new LigaturesAddon();
      try { terminal.loadAddon(addon); ligaturesAddonRef.current = addon; terminal.refresh(0, terminal.rows - 1); } catch (err) { addon.dispose(); ligaturesAddonRef.current = null; }
    } else if (!enabled && current) {
      current.dispose();
      ligaturesAddonRef.current = null;
    }
  }, [settings.terminal_ligatures, effectiveFontFamily]);

  const showToggle = showThemeToggle && modeOverride === undefined;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex min-h-7 items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <div className="text-sm font-medium">{title}</div>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2 py-1 text-xs">
            <span className="font-medium text-muted-foreground">Pane divider</span>
            <input type="checkbox" checked={dividerVisible} onChange={() => setDividerVisible((v) => !v)} />
          </label>
          {showToggle ? (
            <div className="flex gap-0.5 rounded-md border border-border/50 p-0.5">
              {(["dark", "light"] as const).map((m) => (
                <button key={m} onClick={() => setToggleMode(m)} aria-pressed={toggleMode === m} className={`rounded-sm px-2 py-1 text-xs ${toggleMode === m ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>{m}</button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="p-4">
        <div className="flex h-[300px] flex-col overflow-hidden rounded-md border border-border/50">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div ref={containerRef} className="min-w-0 flex-1 overflow-hidden p-2" style={{ backgroundColor: paneBackground }} />
            {dividerVisible ? <div className="shrink-0" style={{ width: `${dividerThickness}px`, backgroundColor: appearance.dividerColor }} /> : null}
            <div className="shrink-0" style={{ width: `${STUB_PANE_PX}px`, backgroundColor: paneBackground, opacity: inactiveOpacity }} />
          </div>
        </div>
      </div>
    </div>
  );
}

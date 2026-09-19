import { useEffect, useRef } from "react";
import { Terminal, type ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";
import type { HydraSettings } from "../shared/settings-types";
import {
  getSystemPrefersDark,
  resolveEffectiveTerminalAppearance,
} from "../lib/terminal-theme";
import { resolveTerminalFontWeights } from "../shared/terminal-fonts";

interface TerminalDrawerProps {
  sessionId: string;
  executable?: string;
  settings?: HydraSettings;
  onContextMenu?: (x: number, y: number) => void;
}

const FALLBACK_FONTS = [
  "SF Mono", "Menlo", "Monaco", "Cascadia Mono", "Consolas",
  "DejaVu Sans Mono", "Liberation Mono", "Hack", "monospace"
] as const;

function buildFontFamily(fontFamily: string): string {
  const trimmed = fontFamily.trim();
  if (!trimmed) return FALLBACK_FONTS.join(", ");
  // If already contains commas, assume user provided full stack — just ensure fallback
  const parts = [trimmed];
  const lower = trimmed.toLowerCase();
  for (const fb of FALLBACK_FONTS) {
    if (!lower.includes(fb.toLowerCase())) {
      parts.push(fb === "monospace" ? fb : `"${fb}"`);
    }
  }
  return parts.join(", ");
}

function normalizeLineHeight(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.min(3, Math.max(1, n));
}

function buildXtermTheme(settings: HydraSettings | undefined): ITheme {
  if (!settings) {
    return {
      background: "#0c0d0e",
      foreground: "#ededed",
      cursor: "#10b981",
      black: "#1e1e1e",
      red: "#ef4444",
      green: "#10b981",
      yellow: "#f59e0b",
      blue: "#3b82f6",
      magenta: "#ec4899",
      cyan: "#06b6d4",
      white: "#ededed",
    };
  }
  const sysDark = getSystemPrefersDark();
  const appearance = resolveEffectiveTerminalAppearance(settings as HydraSettings, sysDark);
  const base = (appearance.theme as ITheme) ?? {};
  const overrides = settings.terminal_color_overrides;
  if (overrides) {
    return { ...base, ...Object.fromEntries(Object.entries(overrides).filter(([, v]) => !!v)) } as ITheme;
  }
  return base as ITheme;
}

export function TerminalDrawer({
  sessionId,
  executable = "bash",
  settings,
  onContextMenu,
}: TerminalDrawerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const term = xtermRef.current;
    const fitAddon = fitAddonRef.current;
    if (!term || !settings) return;
    const theme = buildXtermTheme(settings);
    const weights = resolveTerminalFontWeights(settings.terminal_font_weight, settings.terminal_font_weight_bold);
    // Apply all metric options like Orca terminal-appearance.ts:191
    term.options.theme = theme;
    term.options.fontFamily = buildFontFamily(settings.terminal_font_family);
    term.options.fontSize = settings.terminal_font_size;
    (term.options as unknown as Record<string, unknown>).fontWeight = weights.fontWeight;
    (term.options as unknown as Record<string, unknown>).fontWeightBold = weights.fontWeightBold;
    term.options.lineHeight = normalizeLineHeight(settings.terminal_line_height);
    (term.options as unknown as Record<string, unknown>).cursorStyle = settings.terminal_cursor_style;
    term.options.cursorBlink = settings.terminal_cursor_blink;
    term.options.scrollback = settings.terminal_scrollback_rows ?? 10000;
    if (settings.terminal_minimum_contrast_ratio !== undefined && settings.terminal_minimum_contrast_ratio !== null) {
      (term.options as unknown as Record<string, unknown>).minimumContrastRatio = settings.terminal_minimum_contrast_ratio;
    }
    if (settings.terminal_background_opacity !== undefined && theme.background) {
      // Use allowTransparency like Orca composeActiveTerminalTheme
      (term.options as unknown as Record<string, unknown>).allowTransparency = settings.terminal_background_opacity < 1;
    }
    if (containerRef.current) {
      containerRef.current.style.backgroundColor = theme.background ?? "#0c0d0e";
    }
    // Force xterm to re-measure glyphs and refit — mirrors Orca safeFit/applyOrDeferPaneMetricOptions
    try { (term as unknown as { _core?: { _renderService?: { clear: () => void } } })._core?._renderService?.clear(); } catch {}
    try { term.refresh(0, term.rows - 1); } catch {}
    try { fitAddon?.fit(); } catch {}
  }, [settings]);

  useEffect(() => {
    if (!containerRef.current) return;
    const s = settings;
    const theme = buildXtermTheme(s);
    const weights = s ? resolveTerminalFontWeights(s.terminal_font_weight, s.terminal_font_weight_bold) : { fontWeight: 500, fontWeightBold: 700 };
    const term = new Terminal({
      cursorBlink: s?.terminal_cursor_blink ?? true,
      fontSize: s?.terminal_font_size ?? 14,
      fontFamily: buildFontFamily(s?.terminal_font_family ?? "'JetBrains Mono', 'Fira Code', monospace"),
      lineHeight: normalizeLineHeight(s?.terminal_line_height ?? 1),
      fontWeight: weights.fontWeight,
      fontWeightBold: weights.fontWeightBold,
      cursorStyle: s?.terminal_cursor_style ?? "block",
      scrollback: s?.terminal_scrollback_rows ?? 10000,
      minimumContrastRatio: s?.terminal_minimum_contrast_ratio ?? undefined,
      allowTransparency: s?.terminal_background_opacity !== undefined && s.terminal_background_opacity < 1,
      theme,
    });
    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      const isChord = event.ctrlKey || event.metaKey;
      if (isChord) {
        const key = event.key.toLowerCase();
        if (key === "p" || key === "b" || key === "j" || key === ",") return false;
      }
      return true;
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;
    term.open(containerRef.current);
    fitAddon.fit();
    xtermRef.current = term;
    term.onData((data) => {
      invoke("send_terminal_input", { sessionId, input: data }).catch(console.error);
    });
    invoke("start_agent_terminal", { sessionId, executable, args: [] })
      .then(() => invoke<{ session_id: string; formatted: string; clean_text: string }>("get_terminal_snapshot", { sessionId }))
      .then((snapshot) => { if (snapshot && snapshot.formatted) term.write(snapshot.formatted); })
      .catch(console.error);
    const unlistenPromise = listen<{ session_id: string; output: string }>("terminal:output", (event) => {
      if (event.payload.session_id === sessionId) term.write(event.payload.output);
    });
    const onResize = () => fitAddon.fit();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      unlistenPromise.then((unlisten) => unlisten());
      term.dispose();
      fitAddonRef.current = null;
      xtermRef.current = null;
    };
  }, [sessionId, executable]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e.clientX, e.clientY);
  };
  const bg = (() => {
    try { return buildXtermTheme(settings).background ?? "#0c0d0e"; } catch { return "#0c0d0e"; }
  })();
  return <div ref={containerRef} onContextMenu={handleContextMenu} className="w-full h-full p-2 overflow-hidden" style={{ backgroundColor: bg }} />;
}

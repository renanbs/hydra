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

interface TerminalDrawerProps {
  sessionId: string;
  executable?: string;
  settings?: HydraSettings;
  onContextMenu?: (x: number, y: number) => void;
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

  useEffect(() => {
    const term = xtermRef.current;
    if (!term || !settings) return;
    const theme = buildXtermTheme(settings);
    term.options.theme = theme;
    term.options.fontFamily = settings.terminal_font_family;
    term.options.fontSize = settings.terminal_font_size;
    (term.options as unknown as Record<string, unknown>).fontWeight = settings.terminal_font_weight;
    (term.options as unknown as Record<string, unknown>).lineHeight = settings.terminal_line_height;
    (term.options as unknown as Record<string, unknown>).cursorStyle = settings.terminal_cursor_style;
    term.options.cursorBlink = settings.terminal_cursor_blink;
    if (settings.terminal_minimum_contrast_ratio !== undefined && settings.terminal_minimum_contrast_ratio !== null) {
      (term.options as unknown as Record<string, unknown>).minimumContrastRatio = settings.terminal_minimum_contrast_ratio;
    }
    if (containerRef.current) {
      containerRef.current.style.backgroundColor = theme.background ?? "#0c0d0e";
    }
  }, [settings]);

  useEffect(() => {
    if (!containerRef.current) return;
    const s = settings;
    const theme = buildXtermTheme(s);
    const term = new Terminal({
      cursorBlink: s?.terminal_cursor_blink ?? true,
      fontSize: s?.terminal_font_size ?? 14,
      fontFamily: s?.terminal_font_family ?? "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      lineHeight: s?.terminal_line_height ?? 1,
      fontWeight: s?.terminal_font_weight ?? 500,
      cursorStyle: s?.terminal_cursor_style ?? "block",
      scrollback: s?.terminal_scrollback_rows ?? 10000,
      minimumContrastRatio: s?.terminal_minimum_contrast_ratio ?? undefined,
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

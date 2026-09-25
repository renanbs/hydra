import { useEffect, useRef, useState } from "react";
import { Terminal, type ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TerminalSearch } from "./TerminalSearch";
import "@xterm/xterm/css/xterm.css";
import type { HydraSettings } from "../shared/settings-types";
import {
  getSystemPrefersDark,
  resolveEffectiveTerminalAppearance,
} from "../lib/terminal-theme";
import { resolveTerminalFontWeights } from "../shared/terminal-fonts";
import { createTerminalTuiMouseWheelDistanceState, normalizeTerminalTuiMouseWheelMultiplier, resolveTerminalTuiMouseWheelReportCount } from "../lib/terminal-tui-wheel";
import {
  createTerminalPixelSizeQueryResponder,
  installTerminalCapabilityReplyHandlers,
} from "./terminal-pane/terminal-capability-replies";

export interface TerminalContextActions {
  getSelection: () => string;
  hasSelection: () => boolean;
  selectAll: () => void;
  clearSelection: () => void;
  clearScrollback: () => void;
  clearScreen: () => void;
  paste: () => void;
}

interface TerminalDrawerProps {
  sessionId: string;
  executable?: string;
  cwd?: string;
  settings?: HydraSettings;
  onContextMenu?: (x: number, y: number, actions: TerminalContextActions) => void;
}
const FALLBACK_FONTS = [
  "SF Mono", "Menlo", "Monaco", "Cascadia Mono", "Consolas",
  "DejaVu Sans Mono", "Liberation Mono",
  "Orca Nerd Font Symbols", "Symbols Nerd Font Mono", "MesloLGS Nerd Font", "JetBrainsMono Nerd Font", "Hack Nerd Font",
  "Hack", "monospace"
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

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.length === 3 ? h[0]+h[0] : h.slice(0,2), 16);
  const g = parseInt(h.length === 3 ? h[1]+h[1] : h.slice(2,4), 16);
  const b = parseInt(h.length === 3 ? h[2]+h[2] : h.slice(4,6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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
  let base = (appearance.theme as ITheme) ?? {};
  // Background opacity — Orca composeActiveTerminalTheme
  if (settings.terminal_background_opacity !== undefined && settings.terminal_background_opacity < 1 && base.background) {
    base = { ...base, background: hexToRgba(base.background as string, settings.terminal_background_opacity) };
  }
  const overrides = settings.terminal_color_overrides;
  if (overrides) {
    return { ...base, ...Object.fromEntries(Object.entries(overrides).filter(([, v]) => !!v)) } as ITheme;
  }
  return base as ITheme;
}

export function TerminalDrawer({
  sessionId,
  executable = "bash",
  cwd,
  settings,
  onContextMenu,
}: TerminalDrawerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const webglAddonRef = useRef<unknown | null>(null);
  const imageAddonRef = useRef<unknown | null>(null);
  const ligaturesAddonRef = useRef<unknown | null>(null);

function shouldEnableLigatures(_fontFamily: string | undefined, mode: string | undefined): boolean {
  if (mode === "on") return true;
  if (mode === "off") return false;
  // auto: disabled for now to avoid font-finder Node crash in WebView — enable only on explicit "on"
  return false;
}

  useEffect(() => {
    const term = xtermRef.current;
    const fitAddon = fitAddonRef.current;
    if (!term || !settings) return;
    console.log("[Hydra Terminal] applying typography:", { fontFamily: settings.terminal_font_family, fontSize: settings.terminal_font_size, fontWeight: settings.terminal_font_weight, lineHeight: settings.terminal_line_height });
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
    } else {
      (term.options as unknown as Record<string, unknown>).minimumContrastRatio = undefined;
    }
    if (settings.terminal_background_opacity !== undefined && theme.background) {
      (term.options as unknown as Record<string, unknown>).allowTransparency = settings.terminal_background_opacity < 1;
    }
    // Scroll speed faithful to Orca pane-terminal-options.ts
    (term.options as unknown as Record<string, unknown>).scrollSensitivity = settings.terminal_scroll_sensitivity ?? 1.15;
    (term.options as unknown as Record<string, unknown>).fastScrollSensitivity = settings.terminal_fast_scroll_sensitivity ?? 5;
    if (settings.terminal_word_separator !== undefined) {
      (term.options as unknown as Record<string, unknown>).wordSeparator = settings.terminal_word_separator;
    } else {
      try { delete (term.options as unknown as Record<string, unknown>).wordSeparator; } catch {}
    }
    // GPU acceleration — Orca TerminalRenderingSection auto/on/off with WebGL fallback
    const gpu = settings.terminal_gpu_acceleration ?? "auto";
    if (gpu === "off") {
      try { (webglAddonRef.current as unknown as { dispose?: ()=>void })?.dispose?.(); } catch {}
      webglAddonRef.current = null;
    } else {
      const shouldTry = gpu === "on" || gpu === "auto";
      if (shouldTry && !webglAddonRef.current) {
        import("@xterm/addon-webgl").then(({ WebglAddon }) => {
          if (webglAddonRef.current) return;
          try {
            const addon = new (WebglAddon as unknown as new()=>unknown)();
            (term as unknown as { loadAddon:(a:unknown)=>void }).loadAddon(addon);
            webglAddonRef.current = addon;
          } catch (e) {
            console.warn("[Hydra] WebGL addon failed, fallback DOM", e);
            webglAddonRef.current = null;
          }
        }).catch(()=>{});
      }
    }
    // Inline images — @xterm/addon-image lazy (Orca pane-inline-images.ts)
    const inline = settings.terminal_inline_images !== false;
    if (!inline) {
      try { (imageAddonRef.current as unknown as { dispose?: ()=>void })?.dispose?.(); } catch {}
      imageAddonRef.current = null;
    } else if (!imageAddonRef.current) {
      import("@xterm/addon-image").then(({ ImageAddon }) => {
        if (imageAddonRef.current) return;
        try {
          const addon = new (ImageAddon as unknown as new()=>unknown)();
          (term as unknown as { loadAddon:(a:unknown)=>void }).loadAddon(addon);
          imageAddonRef.current = addon;
        } catch (e) { console.warn("[Hydra] Image addon failed", e); }
      }).catch(()=>{});
    }
    // Ligatures — @xterm/addon-ligatures Orca terminalLigatures auto/on/off
    const wantLigatures = shouldEnableLigatures(settings.terminal_font_family, settings.terminal_ligatures);
    if (!wantLigatures) {
      try { (ligaturesAddonRef.current as unknown as { dispose?: ()=>void })?.dispose?.(); } catch {}
      ligaturesAddonRef.current = null;
    } else if (!ligaturesAddonRef.current) {
      import("@xterm/addon-ligatures").then(({ LigaturesAddon }) => {
        if (ligaturesAddonRef.current) return;
        try {
          const addon = new (LigaturesAddon as unknown as new()=>unknown)();
          (term as unknown as { loadAddon:(a:unknown)=>void }).loadAddon(addon);
          ligaturesAddonRef.current = addon;
        } catch (e) { console.warn("[Hydra] Ligatures addon failed", e); }
      }).catch(()=>{});
    }
    if (containerRef.current) {
      containerRef.current.style.backgroundColor = theme.background ?? "#0c0d0e";
      const px = (settings as any)?.terminal_padding_x;
      const py = (settings as any)?.terminal_padding_y;
      if (px != null || py != null) {
        containerRef.current.style.padding = `${py ?? 4}px ${px ?? 4}px`;
      }
      // Cursor opacity — Orca TerminalCursorAppearanceSection
      const co = (settings as any)?.terminal_cursor_opacity;
      if (co !== undefined && co !== null) {
        containerRef.current.style.setProperty("--xterm-cursor-opacity", String(co));
      } else {
        containerRef.current.style.removeProperty("--xterm-cursor-opacity");
      }
    }
    // Force xterm to re-measure glyphs and refit — mirrors Orca safeFit/applyOrDeferPaneMetricOptions
    try { (term as unknown as { _core?: { _renderService?: { clear: () => void } } })._core?._renderService?.clear(); } catch {}
    try { term.refresh(0, term.rows - 1); } catch {}
    try { fitAddon?.fit(); } catch {}
  }, [settings]);

  // Hide mouse while typing — Orca TerminalWindowSection
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!(settings as any)?.terminal_mouse_hide_while_typing) return;
    const hide = () => { el.style.cursor = "none"; };
    const show = () => { el.style.cursor = ""; };
    el.addEventListener("mousemove", show);
    const term = xtermRef.current;
    // hide on any data (typing) — hook via term.onData if available
    let dispose: (()=>void) | undefined;
    if (term && (term as any).onData) {
      const d = (term as any).onData(() => hide());
      dispose = () => d.dispose?.();
    } else {
      window.addEventListener("keydown", hide);
      dispose = () => window.removeEventListener("keydown", hide);
    }
    return () => { el.removeEventListener("mousemove", show); dispose?.(); el.style.cursor = ""; };
  }, [settings?.terminal_mouse_hide_while_typing]);

  useEffect(() => {
    if (!containerRef.current) return;
    const s = settings;
    const theme = buildXtermTheme(s);
    const weights = s ? resolveTerminalFontWeights(s.terminal_font_weight, s.terminal_font_weight_bold) : { fontWeight: 500, fontWeightBold: 700 };
    const term = new Terminal({
      allowProposedApi: true,
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
      scrollSensitivity: s?.terminal_scroll_sensitivity ?? 1.15,
      fastScrollSensitivity: s?.terminal_fast_scroll_sensitivity ?? 5,
      wordSeparator: s?.terminal_word_separator ?? undefined,
      theme,
    } as unknown as ConstructorParameters<typeof Terminal>[0]);
    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      const isChord = event.ctrlKey || event.metaKey;
      if (isChord) {
        const key = event.key.toLowerCase();
        if (key === "f") {
          event.preventDefault();
          setIsSearchOpen(true);
          return false;
        }
        if (key === "p" || key === "b" || key === "j" || key === "," || key === "t" || key === "n" || key === "o" || key === "d") return false;
      }
      return true;
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;
    const searchAddon = new SearchAddon();
    term.loadAddon(searchAddon);
    searchAddonRef.current = searchAddon;
    // GPU / Image addons initial load faithful to Orca pane-inline-images.ts + webgl diagnostics
    const gpuInit = s?.terminal_gpu_acceleration ?? "auto";
    if (gpuInit !== "off") {
      import("@xterm/addon-webgl").then(({ WebglAddon }) => {
        if (webglAddonRef.current) return;
        try { const a = new (WebglAddon as unknown as new()=>unknown)(); (term as unknown as { loadAddon:(a:unknown)=>void }).loadAddon(a); webglAddonRef.current = a; } catch (e) { console.warn("[Hydra] WebGL init failed", e); }
      }).catch(()=>{});
    }
    if (s?.terminal_inline_images !== false) {
      import("@xterm/addon-image").then(({ ImageAddon }) => {
        if (imageAddonRef.current) return;
        try { const a = new (ImageAddon as unknown as new()=>unknown)(); (term as unknown as { loadAddon:(a:unknown)=>void }).loadAddon(a); imageAddonRef.current = a; } catch (e) { console.warn("[Hydra] Image init failed", e); }
      }).catch(()=>{});
    }
    if (shouldEnableLigatures(s?.terminal_font_family, s?.terminal_ligatures)) {
      import("@xterm/addon-ligatures").then(({ LigaturesAddon }) => {
        if (ligaturesAddonRef.current) return;
        try { const a = new (LigaturesAddon as unknown as new()=>unknown)(); (term as unknown as { loadAddon:(a:unknown)=>void }).loadAddon(a); ligaturesAddonRef.current = a; } catch (e) { console.warn("[Hydra] Ligatures init failed", e); }
      }).catch(()=>{});
    }
    term.open(containerRef.current);
    const doFitAndSync = () => {
      try {
        fitAddon.fit();
        if (term.rows > 0 && term.cols > 0) {
          invoke("resize_terminal", { sessionId, rows: term.rows, cols: term.cols }).catch(() => {});
        }
      } catch {}
    };

    doFitAndSync();
    xtermRef.current = term;
    // Orca pty-input-forward + terminal-capability-replies: answer DA1 / OSC
    // color / pixel-size queries as the parser sees them. Replaying recorded
    // bytes must not leak those replies onto a fresh shell. Live bytes are not replay.
    let replaying = false;
    const sendInput = (data: string): void => {
      if (replaying || !data) return;
      invoke("send_terminal_input", { sessionId, input: data }).catch(console.error);
    };
    term.onData((data) => {
      sendInput(data);
    });
    const capabilityReplies = installTerminalCapabilityReplyHandlers({
      terminal: term,
      parser: term.parser,
      sendInput,
      isReplaying: () => replaying,
    });
    const respondToPixelSizeQueries = createTerminalPixelSizeQueryResponder(term, sendInput);
    const writeLive = (data: string): void => {
      if (!data) return;
      respondToPixelSizeQueries(data);
      term.write(data);
    };
    // Copy on Select — Orca Trim Gutter faithfull: strip common indent if enabled
    try {
      (term as unknown as { onSelectionChange?: (cb: ()=>void)=>void }).onSelectionChange?.(() => {
        const sel = term.getSelection();
        if (!sel) return;
        const shouldCopy = s?.terminal_clipboard_on_select !== false; // default true per settings-types
        if (!shouldCopy) return;
        let text = sel;
        if (s?.terminal_copy_trims_gutter !== false) {
          const lines = text.split("\n");
          const indents = lines.filter(l=>l.trim().length>0).map(l=> l.match(/^\s*/)?.[0].length ?? 0);
          const minIndent = indents.length ? Math.min(...indents) : 0;
          if (minIndent>0) text = lines.map(l=> l.slice(minIndent)).join("\n");
        }
        navigator.clipboard.writeText(text).catch(()=>{});
      });
    } catch {}
    // TUI wheel multiplier — Orca pane-terminal-mouse-wheel.ts faithful with cellHeight/rows + distance accumulation
    try {
      const distanceState = createTerminalTuiMouseWheelDistanceState();
      const replayState = { pending: 0, target: null as EventTarget | null, event: null as WheelEvent | null, pendingDirection: 0 as -1|0|1 };
      const getCellHeight = (): number | undefined => {
        const screen = (term.element as HTMLElement | undefined)?.querySelector<HTMLElement>(".xterm-screen");
        const rect = screen?.getBoundingClientRect();
        if (!rect || rect.height<=0 || term.rows<=0) return undefined;
        return rect.height / term.rows;
      };
      term.attachCustomWheelEventHandler((e: WheelEvent) => {
        const el = term.element as HTMLElement | undefined;
        if (!el?.classList.contains("enable-mouse-events")) return true;
        if (e.deltaY===0 || e.shiftKey) return true;
        if ((e as unknown as Record<string,unknown>).__orcaReplayedTerminalWheelEvent) return true;
        const mult = normalizeTerminalTuiMouseWheelMultiplier(s?.terminal_tui_scroll_sensitivity);
        const reportCount = resolveTerminalTuiMouseWheelReportCount(e, mult, distanceState, { cellHeight: getCellHeight(), rows: term.rows });
        if (reportCount <= 0) return false;
        // Orca queueTerminalTuiWheelReports — replay as line-mode WheelEvents via queueMicrotask
        const dir = e.deltaY < 0 ? -1 : 1;
        if (replayState.pendingDirection!==0 && replayState.pendingDirection!==dir) replayState.pending = 0;
        replayState.pendingDirection = dir;
        replayState.pending += reportCount;
        replayState.target = e.currentTarget instanceof EventTarget ? e.currentTarget : el;
        replayState.event = e;
        if ((replayState as unknown as Record<string,boolean>)._scheduled) return false;
        (replayState as unknown as Record<string,boolean>)._scheduled = true;
        queueMicrotask(() => {
          (replayState as unknown as Record<string,boolean>)._scheduled = false;
          const t = replayState.target; const ev = replayState.event; const cnt = replayState.pending;
          if (!t || !ev || cnt<=0) { replayState.pending=0; replayState.pendingDirection=0; return; }
          replayState.pending=0; replayState.pendingDirection=0;
          for (let i=0;i<cnt;i++) {
            const clone = new WheelEvent(ev.type, {
              bubbles: ev.bubbles, cancelable: ev.cancelable, composed: ev.composed, view: ev.view, detail: ev.detail,
              screenX: ev.screenX, screenY: ev.screenY, clientX: ev.clientX, clientY: ev.clientY,
              ctrlKey: ev.ctrlKey, altKey: ev.altKey, shiftKey: ev.shiftKey, metaKey: ev.metaKey,
              button: ev.button, buttons: ev.buttons, deltaX: 0, deltaY: ev.deltaY < 0 ? -1 : 1, deltaZ: 0, deltaMode: 1
            });
            Object.defineProperty(clone, "__orcaReplayedTerminalWheelEvent", { value: true });
            try { t.dispatchEvent(clone); } catch {}
          }
          replayState.target=null; replayState.event=null;
        });
        return false;
      });
    } catch {}
    const shellArgs = executable === "bash" ? ["--noprofile", "--norc"] : [];
    // Claude Code colors its logo only after the host answers CSI c (device
    // attributes). That query is not in the vt100 snapshot, and the first
    // terminal:output burst can fire before this listener is subscribed, so
    // replay the raw PTY backlog once — it still contains the query.
    let live = false;
    const queued: string[] = [];
    const unlistenPromise = listen<{ session_id: string; output: string }>("terminal:output", (event) => {
      if (event.payload.session_id !== sessionId) return;
      if (live) writeLive(event.payload.output);
      else queued.push(event.payload.output);
    });
    void (async () => {
      try {
        await unlistenPromise;
        await invoke("start_agent_terminal", { sessionId, executable, cwd: cwd || null, args: shellArgs });
        const polled = await invoke<{ data?: string }>("poll_terminal_output", { sessionId, offset: 0 });
        const raw = polled?.data ?? "";
        const buffered = queued.splice(0).join("");
        if (raw) writeLive(raw);
        if (buffered.startsWith(raw)) {
          const rest = buffered.slice(raw.length);
          if (rest) writeLive(rest);
        } else if (buffered && !raw.endsWith(buffered)) {
          writeLive(buffered);
        }
        live = true;
        const late = queued.splice(0).join("");
        if (late) writeLive(late);
        try { term.focus(); } catch {}
      } catch (err) {
        live = true;
        const late = queued.splice(0).join("");
        if (late) writeLive(late);
        console.error(err);
      }
    })();

    const resizeObserver = new ResizeObserver(() => {
      doFitAndSync();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", doFitAndSync);
    return () => {
      window.removeEventListener("resize", doFitAndSync);
      resizeObserver.disconnect();
      unlistenPromise.then((unlisten) => unlisten());
      capabilityReplies.dispose();
      try { (webglAddonRef.current as unknown as { dispose?: ()=>void })?.dispose?.(); } catch {}
      try { (imageAddonRef.current as unknown as { dispose?: ()=>void })?.dispose?.(); } catch {}
      try { (ligaturesAddonRef.current as unknown as { dispose?: ()=>void })?.dispose?.(); } catch {}
      webglAddonRef.current = null;
      imageAddonRef.current = null;
      searchAddonRef.current = null;
      try { searchAddon.dispose(); } catch {}
      term.dispose();
      fitAddonRef.current = null;
      xtermRef.current = null;
    };
  }, [sessionId, executable, cwd]);

  const handleContextMenu = (e: React.MouseEvent) => {
    // Right-click to paste faithful to Orca TerminalInteractionSection
    if (settings?.terminal_right_click_to_paste) {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.readText().then((t) => {
          if (t) invoke("send_terminal_input", { sessionId, input: t }).catch(()=>{});
        }).catch(()=>{});
        return;
      }
    }
    e.preventDefault();
    e.stopPropagation();
    const term = xtermRef.current;
    const actions: TerminalContextActions = {
      getSelection: () => term?.getSelection() ?? "",
      hasSelection: () => Boolean(term?.hasSelection()),
      selectAll: () => term?.selectAll(),
      clearSelection: () => term?.clearSelection(),
      clearScrollback: () => term?.clear(),
      clearScreen: () => {
        invoke("send_terminal_input", { sessionId, input: "\x0c" }).catch(console.error);
      },
      paste: () => {
        navigator.clipboard
          .readText()
          .then((txt) => {
            if (txt) invoke("send_terminal_input", { sessionId, input: txt }).catch(console.error);
          })
          .catch(console.error);
      },
    };
    onContextMenu?.(e.clientX, e.clientY, actions);
  };

  const handleMouseEnter = () => {
    if (settings?.terminal_focus_follows_mouse && xtermRef.current) {
      try { xtermRef.current.focus(); } catch {}
    }
  };
  const bg = (() => {
    try { return buildXtermTheme(settings).background ?? "#0c0d0e"; } catch { return "#0c0d0e"; }
  })();
  const debugInfo = settings ? `${settings.terminal_font_family.split(",")[0].trim().replace(/['"]/g,"")} ${settings.terminal_font_size}px` : "";
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: bg }}>
      <div ref={containerRef} onContextMenu={handleContextMenu} onMouseEnter={handleMouseEnter} className="w-full h-full overflow-hidden" style={{ backgroundColor: bg, padding: `${(settings as any)?.terminal_padding_y ?? 4}px ${(settings as any)?.terminal_padding_x ?? 4}px` }} />
      <TerminalSearch
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false);
          xtermRef.current?.focus();
        }}
        searchAddon={searchAddonRef.current}
      />
      {debugInfo && (
        <div className="absolute bottom-1 right-1 pointer-events-none text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-white/70 border border-white/10">
          {debugInfo}
        </div>
      )}
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from "react";
import { X, Terminal as TerminalIcon } from "lucide-react";
import { TerminalDrawer, type TerminalContextActions } from "../TerminalDrawer";
import type { HydraSettings } from "../../shared/settings-types";
import type { SplitPane } from "./WorkbenchTabBar";

interface SplitTerminalGridProps {
  panes: SplitPane[];
  direction: "horizontal" | "vertical";
  settings?: HydraSettings;
  activePaneId?: string | null;
  onPaneFocus?: (sessionId: string) => void;
  onClosePane?: (sessionId: string) => void;
  onContextMenu?: (x: number, y: number, actions: TerminalContextActions) => void;
  /** optional title for single-pane headerless mode */
  hideSingleHeader?: boolean;
}

/**
 * Sprint 2 P0: grid of 1-4 terminals per tab.
 * - For 1 pane: full fill, no chrome.
 * - For 2 panes horizontal => two columns, vertical => two rows.
 * - For 3-4 panes => 2x2 CSS grid (nested).
 * - Resizable dividers via Flex ratios + drag handle (CSS) without external lib.
 * - Reuses TerminalDrawer per pane (1 PTY per sessionId, vt100 shadow).
 * - Orca conventions: 46x36 not needed per pane header, but close button uses vector SVG.
 */
export function SplitTerminalGrid({
  panes,
  direction,
  settings,
  activePaneId,
  onPaneFocus,
  onClosePane,
  onContextMenu,
  hideSingleHeader = true,
}: SplitTerminalGridProps) {
  const [ratios, setRatios] = useState<number[]>(() => panes.map(() => 1 / panes.length));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<number | null>(null);
  const startPosRef = useRef(0);
  const startRatiosRef = useRef<number[]>([]);

  // Reset ratios when pane count/direction changes
  useEffect(() => {
    setRatios(panes.map(() => 1 / panes.length));
  }, [panes.length, direction]);

  const handleDividerMouseDown = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = idx;
    startPosRef.current = direction === "horizontal" ? e.clientX : e.clientY;
    startRatiosRef.current = [...ratios];
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }, [direction, ratios]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current === null || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const total = direction === "horizontal" ? rect.width : rect.height;
      if (total <= 0) return;
      const deltaPx = (direction === "horizontal" ? e.clientX : e.clientY) - startPosRef.current;
      const deltaRatio = deltaPx / total;
      const idx = draggingRef.current;
      const next = [...startRatiosRef.current];
      // Adjust pair idx and idx+1
      let a = next[idx] + deltaRatio;
      let b = next[idx + 1] - deltaRatio;
      const min = 0.15;
      if (a < min) { b -= (min - a); a = min; }
      if (b < min) { a -= (min - b); b = min; }
      a = Math.max(min, Math.min(1 - min, a));
      b = Math.max(min, Math.min(1 - min, b));
      // Renormalize to keep sum =1 for the two, but other panes untouched — compensate
      const consumed = (next[idx] + next[idx + 1]) - (a + b);
      // if consumed !=0 distribute to others? for 2 panes sum stays 1, for N>2 keep total 1
      if (Math.abs(consumed) > 0.001) {
        // for simplicity, for N>2 we just set those two and keep others, total may drift but ok
      }
      next[idx] = a;
      next[idx + 1] = b;
      // Normalize to sum 1
      const sum = next.reduce((s, v) => s + v, 0);
      const norm = next.map(v => v / sum);
      setRatios(norm);
    };
    const onUp = () => {
      if (draggingRef.current !== null) {
        draggingRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [direction]);

  if (panes.length === 0) return null;

  // Single pane optimization: no header/chrome unless forced
  if (panes.length === 1 && hideSingleHeader) {
    const p = panes[0];
    return (
      <div className="w-full h-full overflow-hidden">
        <TerminalDrawer
          sessionId={p.sessionId}
          executable={p.executable ?? "bash"}
          cwd={p.cwd}
          settings={settings}
          onContextMenu={onContextMenu}
        />
      </div>
    );
  }

  // For 3-4 panes, use nested 2x2 grid when direction horizontal acts as columns; but we treat ratio as flex for simplicity
  // We will render as flex row/column with dividers between each pair; for grid 2x2 we need wrapping.
  // Simplest: for panes.length >2, render CSS grid 2x2 with draggable gaps using same logic per row/col.
  // For P0 we use flex for 2, grid for 3-4.

  if (panes.length > 2) {
    // 2x2 grid layout: first row 2 panes, second row 1-2 panes
    const rows: SplitPane[][] = [];
    for (let i = 0; i < panes.length; i += 2) rows.push(panes.slice(i, i + 2));
    // direction decides primary axis? For vertical, stack rows is natural; for horizontal, also grid.
    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-[var(--app-bg)]" ref={containerRef as any}>
        {rows.map((row, rIdx) => (
          <div key={rIdx} className="flex flex-1 min-h-0 overflow-hidden">
            {row.map((pane, cIdx) => {
              const globalIdx = rIdx * 2 + cIdx;
              const isActive = activePaneId === pane.sessionId;
              const isLastInRow = cIdx === row.length - 1;
              const isLastRow = rIdx === rows.length - 1;
              return (
                <div key={pane.sessionId} className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden">
                  <PaneChrome
                    pane={pane}
                    isActive={isActive}
                    settings={settings}
                    onFocus={() => onPaneFocus?.(pane.sessionId)}
                    onClose={onClosePane ? () => onClosePane(pane.sessionId) : undefined}
                    panesCount={panes.length}
                  />
                  <div
                    className={`flex-1 min-h-0 overflow-hidden border ${isActive ? "border-emerald-500/40" : "border-border/40"}`}
                    onMouseDown={() => onPaneFocus?.(pane.sessionId)}
                  >
                    <TerminalDrawer
                      sessionId={pane.sessionId}
                      executable={pane.executable ?? "bash"}
                      cwd={pane.cwd}
                      settings={settings}
                      onContextMenu={onContextMenu}
                    />
                  </div>
                  {!isLastInRow && (
                    <div
                      onMouseDown={(e) => handleDividerMouseDown(globalIdx, e)}
                      className="w-[6px] shrink-0 cursor-col-resize bg-border hover:bg-emerald-500/40 transition-colors flex items-center justify-center group"
                      title="Drag to resize"
                    >
                      <div className="w-[2px] h-full bg-border group-hover:bg-emerald-400" />
                    </div>
                  )}
                  {!isLastRow && row.length === 2 && cIdx === 0 && (
                    // horizontal divider between rows is handled by outer flex-col; we add a row divider after this row
                    null
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {/* Row dividers */}
        {rows.length > 1 && (
          <div className="h-[6px] shrink-0 cursor-row-resize bg-border hover:bg-emerald-500/30" />
        )}
      </div>
    );
  }

  // 2 panes: flex with ratio
  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex overflow-hidden bg-[var(--app-bg)] ${direction === "horizontal" ? "flex-row" : "flex-col"}`}
    >
      {panes.map((pane, idx) => {
        const isActive = activePaneId === pane.sessionId;
        const ratio = ratios[idx] ?? 0.5;
        const flexBasis = `${(ratio * 100).toFixed(3)}%`;
        return (
          <div
            key={pane.sessionId}
            className="flex flex-col min-w-0 min-h-0 overflow-hidden"
            style={{ flexBasis, flexGrow: 1, flexShrink: 1 }}
            onMouseDown={() => onPaneFocus?.(pane.sessionId)}
          >
            <PaneChrome
              pane={pane}
              isActive={isActive}
              settings={settings}
              onFocus={() => onPaneFocus?.(pane.sessionId)}
              onClose={onClosePane ? () => onClosePane(pane.sessionId) : undefined}
              panesCount={panes.length}
            />
            <div className={`flex-1 min-h-0 overflow-hidden border ${isActive ? "border-emerald-500/40" : "border-border/40"}`}>
              <TerminalDrawer
                sessionId={pane.sessionId}
                executable={pane.executable ?? "bash"}
                cwd={pane.cwd}
                settings={settings}
                onContextMenu={onContextMenu}
              />
            </div>
          </div>
        );
      }).reduce((acc: React.ReactNode[], node, i) => {
        if (i === 0) return [node];
        const divider = (
          <div
            key={`div-${i}`}
            onMouseDown={(e) => handleDividerMouseDown(i - 1, e)}
            className={`${direction === "horizontal" ? "w-[6px] cursor-col-resize" : "h-[6px] cursor-row-resize"} shrink-0 bg-border hover:bg-emerald-500/40 transition-colors flex items-center justify-center group z-10`}
            title="Drag to resize"
          >
            <div className={`${direction === "horizontal" ? "w-[2px] h-full" : "h-[2px] w-full"} bg-border group-hover:bg-emerald-400`} />
          </div>
        );
        return [...acc, divider, node];
      }, [])}
    </div>
  );
}

function PaneChrome({
  pane,
  isActive,
  settings,
  onFocus,
  onClose,
  panesCount,
}: {
  pane: SplitPane;
  isActive: boolean;
  settings?: HydraSettings;
  onFocus?: () => void;
  onClose?: () => void;
  panesCount: number;
}) {
  void settings;
  const label = pane.executable ?? "bash";
  // Short session suffix for disambiguation when multiple panes share same executable
  const shortId = pane.sessionId.slice(-4);
  return (
    <div
      onMouseDown={onFocus}
      className={`h-6 flex items-center justify-between px-2 text-[11px] font-mono border-b shrink-0 select-none cursor-pointer transition-colors ${
        isActive ? "bg-accent/60 text-foreground border-emerald-500/30" : "bg-card text-muted-foreground border-border hover:text-foreground"
      }`}
      title={pane.sessionId}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <TerminalIcon className="w-3 h-3 text-emerald-400 shrink-0" />
        <span className="truncate max-w-[140px]">{label}</span>
        <span className="text-[10px] opacity-60 hidden sm:inline">{shortId}</span>
        {isActive && panesCount > 1 && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      </div>
      {onClose && panesCount > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          title="Close pane"
          className="ml-2 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

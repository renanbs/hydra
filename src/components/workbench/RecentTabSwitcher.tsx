import React from "react";
import { createPortal } from "react-dom";
import { Terminal, File, GitCompare, Pin } from "lucide-react";
import type { TabItem } from "./WorkbenchTabBar";

export interface RecentTabSwitcherProps {
  isOpen: boolean;
  tabs: TabItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onCommit: (tabId: string) => void;
  onCancel: () => void;
}

function TabIcon({ tab }: { tab: TabItem }) {
  if (tab.type === "editor") {
    return <File className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  }
  if (tab.type === "diff") {
    return <GitCompare className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  }
  return <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
}

export function RecentTabSwitcher({
  isOpen,
  tabs,
  selectedIndex,
  onSelectIndex,
  onCommit,
}: RecentTabSwitcherProps): React.JSX.Element | null {
  if (!isOpen || tabs.length <= 1) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-[14vh] select-none bg-black/40 backdrop-blur-xs animate-in fade-in duration-75"
    >
      <div
        className="w-[min(480px,calc(100vw-48px))] overflow-hidden rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        role="listbox"
        aria-label="Recent Tabs Switcher"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-3.5 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Switch Tabs</span>
          <span className="font-mono text-[10px] text-muted-foreground/80 lowercase">
            release ctrl to switch
          </span>
        </div>

        <div className="max-h-[min(340px,50vh)] overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-neutral-700">
          {tabs.map((tab, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={tab.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => onCommit(tab.id)}
                onMouseEnter={() => onSelectIndex(idx)}
                className={`flex h-8 items-center justify-between gap-2.5 px-3 text-xs transition cursor-pointer ${
                  isSelected
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <TabIcon tab={tab} />
                  <span className="truncate text-[12px]">{tab.title}</span>
                  {tab.isPinned && (
                    <Pin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {tab.cwd && (
                    <span className="text-[10px] font-mono text-muted-foreground/70 truncate max-w-[160px]">
                      {tab.cwd.split("/").pop()}
                    </span>
                  )}
                  {tab.color && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: tab.color }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

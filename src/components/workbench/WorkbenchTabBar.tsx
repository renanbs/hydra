import { Terminal, Plus, X } from "lucide-react";

export interface TabItem {
  id: string;
  title: string;
  type: "terminal" | "diff";
}

interface WorkbenchTabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onTabContextMenu?: (e: React.MouseEvent, tab: TabItem) => void;
}

export function WorkbenchTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onTabContextMenu,
}: WorkbenchTabBarProps) {
  return (
    <div className="h-8 border-b border-[#222] bg-[#111214] flex items-center px-1 select-none overflow-x-auto shrink-0">
      {/* Tab strip in Orca style */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTabContextMenu?.(e, tab);
              }}
              className={`group flex items-center gap-2 h-7 px-3 text-xs rounded-t border-t-2 cursor-pointer transition-all ${
                isActive
                  ? "bg-[#0c0d0e] border-emerald-500 text-neutral-100 font-medium shadow-sm"
                  : "bg-transparent border-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
              }`}
            >
              <Terminal className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate max-w-[140px] text-[11px] font-mono">
                {tab.title}
              </span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New Tab Button (+) */}
      <button
        onClick={onNewTab}
        title="New Terminal (+)"
        className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition ml-1 shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

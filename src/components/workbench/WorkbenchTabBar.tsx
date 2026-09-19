import { useState, useRef, useEffect } from "react";
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
  onRenameTab: (id: string, newTitle: string) => void;
  onTabContextMenu?: (e: React.MouseEvent, tab: TabItem) => void;
}

export function WorkbenchTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onRenameTab,
  onTabContextMenu,
}: WorkbenchTabBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleStartRename = (tab: TabItem) => {
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  const handleCommitRename = (id: string) => {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      onRenameTab(id, trimmed);
    }
    setEditingTabId(null);
  };

  return (
    <div className="h-8 border-b border-[#222] bg-[#111214] flex items-center px-1 select-none overflow-x-auto shrink-0">
      {/* Abas e botão '+' posicionado imediatamente após a última aba (Orca Style) */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = tab.id === editingTabId;

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onDoubleClick={() => handleStartRename(tab)}
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

              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleCommitRename(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCommitRename(tab.id);
                    if (e.key === "Escape") setEditingTabId(null);
                  }}
                  className="bg-[#141518] text-white border border-emerald-500/80 rounded px-1 text-[11px] font-mono outline-none w-28"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate max-w-[140px] text-[11px] font-mono">
                  {tab.title}
                </span>
              )}

              {tabs.length > 1 && !isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  title="Close tab"
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Botão de Nova Aba (+) grudado ao lado direito da última aba */}
        <button
          onClick={onNewTab}
          title="New Terminal Tab (+)"
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition ml-0.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Espaço restante vazio da barra de abas */}
      <div className="flex-1 h-full" />
    </div>
  );
}

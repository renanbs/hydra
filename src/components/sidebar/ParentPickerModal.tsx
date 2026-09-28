import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { FolderTree, Search, Check, Unlink, X } from "lucide-react";

export interface ParentCandidate {
  id: string;
  name: string;
  path: string;
  branch?: string;
}

export interface ParentPickerModalProps {
  open: boolean;
  targetName: string;
  currentParentPath?: string | null;
  candidates: ParentCandidate[];
  onOpenChange: (open: boolean) => void;
  onSelect: (parentPath: string) => void;
  onRemoveParent?: () => void;
}

export function ParentPickerModal({
  open,
  targetName,
  currentParentPath,
  candidates,
  onOpenChange,
  onSelect,
  onRemoveParent,
}: ParentPickerModalProps): React.JSX.Element | null {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.path.toLowerCase().includes(q) ||
        (c.branch && c.branch.toLowerCase().includes(q))
    );
  }, [candidates, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-[#141518] border border-[#2a2b30] shadow-2xl text-xs text-neutral-200 p-5 space-y-4 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <FolderTree className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-medium uppercase tracking-wider">
                Lineage
              </span>
            </div>
            <h2 className="text-sm font-semibold text-neutral-100 tracking-tight">
              {currentParentPath ? "Change Parent Worktree" : "Set Parent Worktree"}
            </h2>
            <p className="text-[11px] text-neutral-400">
              Select parent workspace for <span className="text-neutral-200 font-medium">{targetName}</span>
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-[#1f2024] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={query}
            placeholder="Search workspaces..."
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-2.5 rounded-md bg-[#0e0f11] border border-[#2a2b30] text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400 transition"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 border border-[#222328] rounded-lg p-1 bg-[#0b0c0e]">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-neutral-500 text-xs">
              No eligible parent workspaces found
            </div>
          ) : (
            filtered.map((candidate) => {
              const isCurrent = candidate.path === currentParentPath;
              return (
                <button
                  key={candidate.id}
                  onClick={() => {
                    onSelect(candidate.path);
                    onOpenChange(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-left transition cursor-pointer group ${
                    isCurrent
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-neutral-100"
                      : "hover:bg-[#1a1b1f] text-neutral-300"
                  }`}
                >
                  <div className="min-w-0 pr-2 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-neutral-200 text-xs truncate">
                        {candidate.name}
                      </span>
                      {candidate.branch && (
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {candidate.branch}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate font-mono">
                      {candidate.path}
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium shrink-0">
                      <Check className="w-3 h-3" />
                      Current
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#222328] shrink-0">
          {currentParentPath && onRemoveParent ? (
            <button
              type="button"
              onClick={() => {
                onRemoveParent();
                onOpenChange(false);
              }}
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-red-400 hover:bg-red-500/10 hover:text-red-300 transition cursor-pointer text-[11px]"
            >
              <Unlink className="w-3 h-3" />
              Remove Link
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 h-7 rounded-md border border-[#2a2b30] text-neutral-300 hover:bg-[#1f2024] hover:text-neutral-100 transition cursor-pointer text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

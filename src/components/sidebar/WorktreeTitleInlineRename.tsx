// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

export interface WorktreeTitleInlineRenameProps {
  displayName: string;
  disabled?: boolean;
  className?: string;
  onEditingChange?: (editing: boolean) => void;
  onRename: (newDisplayName: string) => Promise<void> | void;
  beginEditing?: boolean;
  onBeginEditingConsumed?: () => void;
}

export function WorktreeTitleInlineRename({
  displayName,
  disabled = false,
  className = "text-[13px] leading-5 font-medium text-neutral-100",
  onEditingChange,
  onRename,
  beginEditing = false,
  onBeginEditingConsumed,
}: WorktreeTitleInlineRenameProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(displayName);
  }, [displayName]);

  useEffect(() => {
    if (beginEditing && !disabled && !editing) {
      setEditing(true);
      onEditingChange?.(true);
      onBeginEditingConsumed?.();
    }
  }, [beginEditing, disabled, editing, onEditingChange, onBeginEditingConsumed]);

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  const commit = useCallback(
    async (nextValue: string) => {
      const trimmed = nextValue.trim();
      if (!trimmed || trimmed === displayName) {
        setEditing(false);
        setValue(displayName);
        onEditingChange?.(false);
        return;
      }
      setSaving(true);
      try {
        await onRename(trimmed);
      } catch (err) {
        console.error("Failed to rename worktree title:", err);
      } finally {
        setSaving(false);
        setEditing(false);
        onEditingChange?.(false);
      }
    },
    [displayName, onEditingChange, onRename]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      commit(value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setValue(displayName);
      setEditing(false);
      onEditingChange?.(false);
    }
  };

  const handleBlur = () => {
    if (editing && !saving) {
      commit(value);
    }
  };

  if (editing) {
    return (
      <div className="flex-1 min-w-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full bg-[#1c1d22] border border-indigo-500/70 rounded px-1.5 py-0.5 text-[12px] font-medium text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {saving && <LoaderCircle className="w-3 h-3 animate-spin text-neutral-400 shrink-0" />}
      </div>
    );
  }

  return (
    <span
      onDoubleClick={(e) => {
        if (!disabled) {
          e.stopPropagation();
          setEditing(true);
          onEditingChange?.(true);
        }
      }}
      className={`truncate cursor-default select-none ${className}`}
      title={displayName}
    >
      {displayName}
    </span>
  );
}

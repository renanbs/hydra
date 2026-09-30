// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

export type WorktreeTitleRenameCommit = { kind: 'cancel' } | { kind: 'save'; displayName: string }

export function getWorktreeTitleRenameCommit(
  currentDisplayName: string,
  nextDisplayName: string
): WorktreeTitleRenameCommit {
  const trimmed = nextDisplayName.trim()
  if (!trimmed || trimmed === currentDisplayName) {
    return { kind: 'cancel' }
  }
  return { kind: 'save', displayName: trimmed }
}

export interface WorktreeTitleInlineRenameProps {
  displayName: string
  disabled?: boolean
  showUnreadEmphasis?: boolean
  dimReadTitle?: boolean
  editingPresentation?: 'text' | 'field'
  className?: string
  editingClassName?: string
  inputClassName?: string
  titleWrapper?: (title: React.ReactElement) => React.ReactElement
  wrapTitle?: boolean
  onEditingChange?: (editing: boolean) => void
  onRename: (displayName: string) => Promise<void> | void
  beginEditing?: boolean
  onBeginEditingConsumed?: () => void
}

export function WorktreeTitleInlineRename({
  displayName,
  disabled = false,
  showUnreadEmphasis = false,
  dimReadTitle = false,
  editingPresentation = 'text',
  className,
  editingClassName,
  inputClassName,
  titleWrapper,
  wrapTitle = false,
  onEditingChange,
  onRename,
  beginEditing = false,
  onBeginEditingConsumed
}: WorktreeTitleInlineRenameProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const cancellingRef = useRef(false)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(displayName)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(displayName)
  }, [displayName])

  useEffect(() => {
    if (beginEditing && !disabled && !editing) {
      setEditing(true)
      onEditingChange?.(true)
      onBeginEditingConsumed?.()
    }
  }, [beginEditing, disabled, editing, onEditingChange, onBeginEditingConsumed])

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [editing])

  const commit = useCallback(
    async (nextValue: string) => {
      const trimmed = nextValue.trim()
      if (!trimmed || trimmed === displayName) {
        setEditing(false)
        setValue(displayName)
        onEditingChange?.(false)
        return
      }
      setSaving(true)
      try {
        await onRename(trimmed)
      } catch (err) {
        console.error('Failed to rename worktree title:', err)
      } finally {
        setSaving(false)
        setEditing(false)
        onEditingChange?.(false)
      }
    },
    [displayName, onEditingChange, onRename]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      commit(value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancellingRef.current = true
      setValue(displayName)
      setEditing(false)
      onEditingChange?.(false)
    }
  }

  const handleBlur = () => {
    if (cancellingRef.current) {
      cancellingRef.current = false
      return
    }
    if (editing && !saving) {
      commit(value)
    }
  }

  if (editing) {
    return (
      <div
        className={cn('flex-1 min-w-0 flex items-center gap-1', editingClassName)}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={cn(
            editingPresentation === 'field'
              ? 'h-6 rounded-sm border border-input bg-input/40 px-1.5 py-0 shadow-xs selection:bg-[Highlight] selection:text-[HighlightText] focus-visible:border-ring focus-visible:ring-[1px] focus-visible:ring-ring/50 dark:bg-input/30 text-[12px]'
              : 'w-full bg-input/80 border border-worktree-sidebar-ring/60 rounded px-1.5 py-0.5 text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-worktree-sidebar-ring',
            inputClassName
          )}
        />
        {saving && <LoaderCircle className="size-3 animate-spin text-muted-foreground shrink-0" />}
      </div>
    )
  }

  const titleNode = (
    <span
      onDoubleClick={(e) => {
        if (!disabled) {
          e.stopPropagation()
          setEditing(true)
          onEditingChange?.(true)
        }
      }}
      className={cn(
        wrapTitle ? 'break-words cursor-default select-none' : 'truncate cursor-default select-none',
        showUnreadEmphasis
          ? 'font-medium text-worktree-sidebar-foreground'
          : dimReadTitle
            ? 'font-normal text-worktree-sidebar-foreground/85'
            : 'font-normal text-worktree-sidebar-foreground',
        className
      )}
      title={displayName}
    >
      {displayName}
    </span>
  )

  return titleWrapper ? titleWrapper(titleNode) : titleNode
}

export default WorktreeTitleInlineRename

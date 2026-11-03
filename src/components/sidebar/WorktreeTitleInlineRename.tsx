// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeTitleInlineRename.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { WorkspaceEmojiSuggestionPopover } from '@/components/workspace-emoji/WorkspaceEmojiSuggestionPopover'
import { useWorkspaceEmojiShortcodeInput } from '@/components/workspace-emoji/useWorkspaceEmojiShortcodeInput'
import { translate } from '@/i18n/i18n'
import { isImeCompositionKeyDown } from '../../lib/ime-composition-keyboard-event'
import { cn } from '../../lib/utils'
import { isSidebarLabelTruncated } from './truncated-sidebar-label'

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
  const titleRef = useRef<HTMLSpanElement | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const removeResizeListenerRef = useRef<(() => void) | null>(null)
  const cancellingRef = useRef(false)
  // Why refs alongside state: blur and Enter can both fire inside one commit, and
  // an unmount during the save must not notify the card twice.
  const mountedRef = useRef(true)
  const editingRef = useRef(false)
  const savingRef = useRef(false)
  const notifiedRef = useRef(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [value, setValue] = useState(displayName)
  const [truncated, setTruncated] = useState(false)
  const emojiInput = useWorkspaceEmojiShortcodeInput({
    disabled: saving,
    inputRef,
    onValueChange: setValue,
    value
  })

  useEffect(() => {
    setValue(displayName)
  }, [displayName])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const notifyEditingChange = useCallback(
    (next: boolean) => {
      if (notifiedRef.current === next) {
        return
      }
      notifiedRef.current = next
      onEditingChange?.(next)
    },
    [onEditingChange]
  )

  const beginEditingNow = useCallback(() => {
    if (editingRef.current) {
      return
    }
    editingRef.current = true
    setEditing(true)
    notifyEditingChange(true)
  }, [notifyEditingChange])

  const finishEditing = useCallback(() => {
    editingRef.current = false
    setEditing(false)
    notifyEditingChange(false)
  }, [notifyEditingChange])

  useEffect(() => {
    if (!beginEditing) {
      return
    }
    // Why: always consume the request so the parent's trigger cannot linger; a
    // disabled or already-editing title simply skips the open.
    onBeginEditingConsumed?.()
    if (disabled || editingRef.current) {
      return
    }
    beginEditingNow()
  }, [beginEditing, disabled, beginEditingNow, onBeginEditingConsumed])

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [editing])

  // Why: ResizeObserver does not fire when only the text changes, so the span is
  // remeasured whenever its content or emphasis class changes.
  const measureTruncated = useCallback(() => {
    const node = titleRef.current
    const next = node ? isSidebarLabelTruncated(node) : false
    setTruncated((current) => (current === next ? current : next))
  }, [])

  const handleTitleRef = useCallback(
    (node: HTMLSpanElement | null) => {
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      removeResizeListenerRef.current?.()
      removeResizeListenerRef.current = null
      titleRef.current = node
      // Why: wrapped titles render in full and never truncate, so skip the measure
      // and observer entirely — for that mode it could only churn unused state.
      if (!node || wrapTitle) {
        setTruncated(false)
        return
      }
      measureTruncated()
      // Why: compact sidebar width changes can clip a title that was readable;
      // fall back to window resize where ResizeObserver is unavailable.
      if (typeof ResizeObserver === 'undefined') {
        const onWindowResize = (): void => measureTruncated()
        window.addEventListener('resize', onWindowResize)
        removeResizeListenerRef.current = () => window.removeEventListener('resize', onWindowResize)
        return
      }
      const observer = new ResizeObserver(measureTruncated)
      observer.observe(node)
      resizeObserverRef.current = observer
    },
    [measureTruncated, wrapTitle]
  )

  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect()
      removeResizeListenerRef.current?.()
    }
  }, [])

  const commit = useCallback(
    async (nextValue: string) => {
      if (savingRef.current) {
        return
      }
      const outcome = getWorktreeTitleRenameCommit(displayName, nextValue)
      if (outcome.kind === 'cancel') {
        emojiInput.close()
        setValue(displayName)
        finishEditing()
        return
      }
      savingRef.current = true
      setSaving(true)
      try {
        await onRename(outcome.displayName)
        if (!mountedRef.current) {
          return
        }
      } catch (error) {
        // Why a toast: the console line was invisible in a release build, so a
        // failed rename looked like a successful one that reverted on refresh.
        toast.error(
          error instanceof Error
            ? error.message
            : translate(
                'auto.components.sidebar.WorktreeTitleInlineRename.8df295a78d',
                'Failed to rename workspace.'
              )
        )
        if (mountedRef.current) {
          setValue(displayName)
        }
      } finally {
        savingRef.current = false
        if (mountedRef.current) {
          setSaving(false)
          finishEditing()
        }
      }
    },
    [displayName, emojiInput, finishEditing, onRename]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Why: the emoji list owns arrows/Enter/Tab/Escape while open; it also
    // swallows composition keys so the picker cannot commit mid-conversion.
    if (emojiInput.handleKeyDown(e)) {
      return
    }
    // Why: CJK IMEs fire Enter to confirm a conversion candidate; committing the
    // half-converted value would rename the workspace to a partial glyph run.
    if (isImeCompositionKeyDown(e)) {
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      void commit(value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancellingRef.current = true
      emojiInput.close()
      setValue(displayName)
      finishEditing()
    }
  }

  const handleBlur = () => {
    if (cancellingRef.current) {
      cancellingRef.current = false
      return
    }
    if (editingRef.current && !savingRef.current) {
      void commit(value)
    }
  }

  if (editing) {
    return (
      <>
      <div
        className={cn('flex min-w-0 flex-1 items-center gap-1', editingClassName)}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={saving}
          spellCheck={false}
          aria-label={translate(
            'auto.components.sidebar.WorktreeTitleInlineRename.bff3bdd00c',
            'Rename workspace'
          )}
          onChange={(e) =>
            emojiInput.handleValueChange(e.target.value, e.target.selectionStart)
          }
          onSelect={(e) => emojiInput.syncCursor(e.currentTarget)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={cn(
            editingPresentation === 'field'
              ? 'h-6 rounded-sm border border-input bg-input/40 px-1.5 py-0 text-[12px] shadow-xs selection:bg-[Highlight] selection:text-[HighlightText] focus-visible:border-ring focus-visible:ring-[1px] focus-visible:ring-ring/50 dark:bg-input/30'
              : 'h-[1lh] w-full rounded-none border-0 !border-transparent !bg-transparent p-0 text-[12px] font-medium text-foreground placeholder:text-muted-foreground !shadow-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none dark:!bg-transparent',
            // Why: reserve the trailing slot so the spinner never covers the caret's text.
            saving && 'pr-6',
            inputClassName
          )}
        />
        {saving && <LoaderCircle className="size-3 shrink-0 animate-spin text-muted-foreground" />}
      </div>
      <WorkspaceEmojiSuggestionPopover
        anchorRef={inputRef}
        open={emojiInput.open}
        commandValue={emojiInput.commandValue}
        heading={translate(
          'auto.components.new.workspace.SmartWorkspaceNameField.emoji',
          'Emoji'
        )}
        suggestions={emojiInput.suggestions}
        onCommandValueChange={emojiInput.onCommandValueChange}
        onSelect={emojiInput.selectSuggestion}
        onOpenChange={(open) => !open && emojiInput.close()}
        side="right"
        contentClassName="w-56"
      />
      </>
    )
  }

  const titleNode = (
    <span
      // Why the key: a fresh node re-runs the geometry measurement, so a title
      // that grew past the row (or lost its unread weight) re-evaluates its tooltip.
      key={`${displayName}:${showUnreadEmphasis ? 'unread' : 'read'}`}
      ref={handleTitleRef}
      tabIndex={0}
      onDoubleClick={(e) => {
        if (!disabled) {
          e.stopPropagation()
          beginEditingNow()
        }
      }}
      className={cn(
        wrapTitle ? 'cursor-default break-words select-none' : 'truncate cursor-default select-none',
        showUnreadEmphasis
          ? 'font-medium text-worktree-sidebar-foreground'
          : dimReadTitle
            ? 'font-normal text-worktree-sidebar-foreground/85'
            : 'font-normal text-worktree-sidebar-foreground',
        'outline-none focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring',
        className
      )}
    >
      {displayName}
      {showUnreadEmphasis ? (
        <span className="sr-only">
          {translate('auto.components.sidebar.WorktreeCard.unread', ' (unread)')}
        </span>
      ) : null}
    </span>
  )

  // Why: the hover card is the richer affordance and the card suppresses this
  // tooltip when it is mounted; showing both made two overlays fight.
  if (titleWrapper || !truncated) {
    return titleWrapper ? titleWrapper(titleNode) : titleNode
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{titleNode}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="max-w-80 break-all whitespace-normal text-left"
      >
        {displayName}
      </TooltipContent>
    </Tooltip>
  )
}

export default WorktreeTitleInlineRename

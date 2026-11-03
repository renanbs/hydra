// Ported from Orca (`renderer/src/components/workspace-emoji/WorkspaceEmojiSuggestionPopover.tsx`).
//
// A plain list rather than Orca's cmdk `Command`: the hook owns arrow/enter
// handling from the input, so the popover only paints the current matches and
// reports clicks. Selection is scrolled into view on every command change.
import { useEffect, useRef, type ComponentProps, type RefObject } from 'react'

import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { WorkspaceEmojiSuggestion } from '@/lib/workspace-emoji-shortcodes'

type WorkspaceEmojiSuggestionPopoverProps = {
  anchorRef: RefObject<HTMLInputElement | null>
  commandValue: string
  contentClassName?: string
  heading: string
  onCommandValueChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onSelect: (suggestion: WorkspaceEmojiSuggestion) => void
  open: boolean
  portalContainer?: HTMLElement | null
  side?: ComponentProps<typeof PopoverContent>['side']
  suggestions: readonly WorkspaceEmojiSuggestion[]
}

export function WorkspaceEmojiSuggestionPopover({
  anchorRef,
  commandValue,
  contentClassName,
  heading,
  onCommandValueChange,
  onOpenChange,
  onSelect,
  open,
  portalContainer,
  side = 'top',
  suggestions
}: WorkspaceEmojiSuggestionPopoverProps): React.JSX.Element {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !commandValue) {
      return
    }
    const item = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[data-emoji-option]') ?? []
    ).find((node) => node.getAttribute('data-value') === commandValue)
    item?.scrollIntoView({ block: 'nearest' })
  }, [commandValue, open, suggestions])

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor virtualRef={anchorRef as RefObject<HTMLInputElement>} />
      <PopoverContent
        data-workspace-emoji-suggestions="true"
        align="start"
        side={side}
        sideOffset={4}
        avoidCollisions={false}
        portalContainer={portalContainer}
        className={cn(
          'popover-scroll-content flex max-h-56 w-[var(--radix-popover-trigger-width)] flex-col p-0',
          contentClassName
        )}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) {
            event.preventDefault()
          }
        }}
        onFocusOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) {
            event.preventDefault()
          }
        }}
      >
        <div className="px-3 pt-2 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {heading}
        </div>
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1">
          {suggestions.map((suggestion) => {
            const value = `emoji:${suggestion.shortcode}`
            const selected = value === commandValue
            return (
              <button
                key={suggestion.shortcode}
                type="button"
                data-emoji-option=""
                data-value={value}
                aria-selected={selected}
                role="option"
                onMouseEnter={() => onCommandValueChange(value)}
                onClick={() => onSelect(suggestion)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs',
                  selected ? 'bg-accent text-accent-foreground' : 'text-foreground'
                )}
              >
                <span className="w-5 shrink-0 text-center text-base leading-none">
                  {suggestion.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono">
                  :{suggestion.shortcode}:
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

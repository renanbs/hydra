// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeIssueLinkField.tsx
//
// The workspace tracks one GitHub issue and one Linear issue, and setting either
// clears the other. The field states which provider the value belongs to and, in
// a live region, which persisted link a save would therefore drop.
import type React from 'react'
import { ChevronDown, CircleDot } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

// Why: the value must clear the chip that floats over the input's right edge.
const ADORNMENT_RESERVE = '4.5rem'

export type WorktreeIssueProvider = 'github' | 'linear'

export type WorktreeIssueLinkFieldProps = {
  inputRef: React.RefObject<HTMLInputElement | null>
  value: string
  provider: WorktreeIssueProvider
  /** Set when the current value cannot be saved, so the row can explain why. */
  isInvalid: boolean
  /** Names the links this save would drop. */
  displacedLinkLabels: string[] | null
  onValueChange: (value: string) => void
  onProviderChange: (provider: WorktreeIssueProvider) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export function WorktreeIssueLinkField({
  inputRef,
  value,
  provider,
  isInvalid,
  displacedLinkLabels,
  onValueChange,
  onProviderChange,
  onKeyDown
}: WorktreeIssueLinkFieldProps): React.JSX.Element {
  const label =
    provider === 'linear'
      ? translate('auto.components.sidebar.WorktreeIssueLinkField.25852bfc59', 'Linear')
      : translate('auto.components.sidebar.WorktreeIssueLinkField.5b440069e6', 'GitHub')

  const helperText = (() => {
    if (isInvalid) {
      return provider === 'linear'
        ? translate(
            'auto.components.sidebar.WorktreeIssueLinkField.964d9bc00a',
            'Not a Linear issue key or linear.app issue URL.'
          )
        : translate(
            'auto.components.sidebar.WorktreeIssueLinkField.0a7a2c6efd',
            'Not a GitHub issue number or issue URL.'
          )
    }
    // Whole sentences per arity: a translated " and " fragment does not survive
    // languages that order or punctuate lists differently.
    if (displacedLinkLabels && displacedLinkLabels.length > 1) {
      return translate(
        'auto.components.sidebar.WorktreeIssueLinkField.72486800ff',
        'Saving unlinks {{first}} and {{second}} — a workspace tracks one issue.',
        { first: displacedLinkLabels[0], second: displacedLinkLabels[1] }
      )
    }
    if (displacedLinkLabels?.length) {
      return translate(
        'auto.components.sidebar.WorktreeIssueLinkField.2c245ac134',
        'Saving unlinks {{link}} — a workspace tracks one issue.',
        { link: displacedLinkLabels[0] }
      )
    }
    return translate(
      'auto.components.sidebar.WorktreeIssueLinkField.f047887705',
      'Paste a GitHub or Linear URL, or enter a number. Leave blank to remove the link.'
    )
  })()

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">
        {translate('auto.components.sidebar.WorktreeIssueLinkField.ad78f9bee2', 'Issue')}
      </label>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-invalid={isInvalid || undefined}
          placeholder={
            provider === 'linear'
              ? translate('auto.components.sidebar.WorktreeIssueLinkField.linearPlaceholder', 'ENG-123')
              : translate('auto.components.sidebar.WorktreeIssueLinkField.662ae142f8', 'Issue #')
          }
          className="h-8 text-xs"
          style={{ paddingRight: ADORNMENT_RESERVE }}
        />
        <div className="absolute top-1 right-1 flex items-center">
          {/* Why: `modal` would stack a second scroll-lock layer over the dialog's. */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                aria-label={translate(
                  'auto.components.sidebar.WorktreeIssueLinkField.929c98d05a',
                  'Issue provider'
                )}
                className="h-6 px-1 text-[10px] font-medium text-muted-foreground"
              >
                {provider === 'linear' ? (
                  <span className="text-[9px] font-bold">L</span>
                ) : (
                  <CircleDot className="size-3" />
                )}
                {label}
                <ChevronDown className="size-2.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-32">
              <DropdownMenuRadioGroup
                value={provider}
                onValueChange={(next) => {
                  if (next === 'github' || next === 'linear') {
                    onProviderChange(next)
                  }
                }}
              >
                <DropdownMenuRadioItem value="github" className="text-xs">
                  <CircleDot className="size-3" />
                  {translate('auto.components.sidebar.WorktreeIssueLinkField.5b440069e6', 'GitHub')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="linear" className="text-xs">
                  <span className="text-[9px] font-bold">L</span>
                  {translate('auto.components.sidebar.WorktreeIssueLinkField.25852bfc59', 'Linear')}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Why: two lines are reserved up front — the dialog is centered by transform,
          so a wrap-count change would shift the field being typed in. The failure
          and displacement messages appear without focus moving here, so the region
          is live. */}
      <p
        role="status"
        aria-live="polite"
        className={cn(
          'min-h-[28px] text-[10px] leading-[14px]',
          isInvalid ? 'text-destructive' : displacedLinkLabels?.length ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
        )}
      >
        {helperText}
      </p>
    </div>
  )
}

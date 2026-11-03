// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeDisplayNameField.tsx
//
// Emoji shortcode suggestions are not part of the card port: they need the
// `emojibase-data` catalog and the command primitive, neither of which this
// renderer ships. The field keeps everything else — label, focus, Enter, hint.
import type { RefObject } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { translate } from '@/i18n/i18n'

type WorktreeDisplayNameFieldProps = {
  disabled: boolean
  inputRef: RefObject<HTMLInputElement | null>
  onEnter: () => void | Promise<void>
  onValueChange: (value: string) => void
  value: string
}

export function WorktreeDisplayNameField({
  disabled,
  inputRef,
  onEnter,
  onValueChange,
  value
}: WorktreeDisplayNameFieldProps): React.JSX.Element {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-muted-foreground">
        {translate('auto.components.sidebar.WorktreeMetaDialog.ad5e4e514f', 'Display Name')}
      </Label>
      <Input
        ref={inputRef}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
            return
          }
          event.preventDefault()
          void onEnter()
        }}
        placeholder={translate(
          'auto.components.sidebar.WorktreeMetaDialog.7f21e0464f',
          'Custom display name...'
        )}
        className="h-8 text-xs"
      />
      <p className="text-[10px] text-muted-foreground">
        {translate(
          'auto.components.sidebar.WorktreeMetaDialog.459ad7f650',
          'Only changes the name shown in the sidebar — the folder on disk stays the same. Leave blank to use the branch or folder name.'
        )}
      </p>
    </div>
  )
}

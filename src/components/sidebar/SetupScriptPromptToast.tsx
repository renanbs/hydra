// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/SetupScriptPromptToast.tsx
import React from 'react'
import { toast } from 'sonner'

type SavedInProjectSettingsToastProps = {
  onOpenSettings: () => void
}

function SavedInProjectSettingsToast({
  onOpenSettings
}: SavedInProjectSettingsToastProps): React.JSX.Element {
  return (
    <span>
      Saved in this{' '}
      <button
        type="button"
        className="rounded-sm font-medium underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={onOpenSettings}
      >
        project&apos;s settings
      </button>
    </span>
  )
}

export function showSavedInProjectSettingsToast(input: {
  onOpenSettings: () => void
  description?: React.ReactNode
}): void {
  // The confirmation is also the fastest path back to the setup editor the user
  // just changed, so the noun itself is the link.
  toast.success(<SavedInProjectSettingsToast onOpenSettings={input.onOpenSettings} />, {
    description: input.description
  })
}

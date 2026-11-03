// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeOpenInMenu.tsx
//
// The entry list and per-entry availability are pure so both the card menu and the
// settings preview can ask the same questions. Resolution helpers (capability,
// file-manager label) live in `lib/open-in-path-guard`.
import { translate } from '@/i18n/i18n'
import type { HydraSettings, OpenInApplication } from '../../shared/settings-types'
import {
  getExternalEditorOpenCapability,
  isLocalPathOpenBlocked,
  type OpenInTarget
} from '../../lib/open-in-path-guard'

export type OpenInMenuEntry = {
  id: string
  label: string
  target: OpenInTarget
  command?: string
}

export function getWorktreeOpenInEntries(
  openInApplications: readonly OpenInApplication[],
  fileManagerLabel: string
): OpenInMenuEntry[] {
  return [
    ...openInApplications.map((application) => ({
      id: application.id,
      label: application.label,
      target: 'external-editor' as const,
      command: application.command
    })),
    { id: 'file-manager', label: fileManagerLabel, target: 'file-manager' }
  ]
}

export function getOpenInEntryAvailability(
  entry: OpenInMenuEntry,
  settings: Pick<HydraSettings, 'activeRuntimeEnvironmentId'> | null | undefined,
  connectionId?: string | null
): { disabled: boolean; metadata?: string } {
  if (entry.target === 'file-manager') {
    const disabled = isLocalPathOpenBlocked(settings, { connectionId })
    return disabled
      ? {
          disabled: true,
          metadata: translate('auto.components.sidebar.WorktreeOpenInMenu.localOnly', 'Local only')
        }
      : { disabled: false }
  }
  const capability = getExternalEditorOpenCapability(settings, {
    connectionId,
    command: entry.command
  })
  if (!capability.allowed) {
    return {
      disabled: true,
      metadata: translate('auto.components.sidebar.WorktreeOpenInMenu.localOnly', 'Local only')
    }
  }
  return capability.remote
    ? {
        disabled: false,
        metadata: translate('auto.components.sidebar.WorktreeOpenInMenu.remoteSsh', 'Remote SSH')
      }
    : { disabled: false }
}

export function openOpenInAppsSettings(): void {
  // Why the event bus: the menu is owned by App, but settings open through the
  // single deep-link handler that resets the requested pane and anchor together.
  window.dispatchEvent(
    new CustomEvent('hydra:open-settings', {
      detail: { section: 'git', sectionId: 'general-open-in-apps' }
    })
  )
}

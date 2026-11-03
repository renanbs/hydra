import type { UpdateCheckOptions } from '../shared/update-status-types'
import { getShortcutPlatform } from './shortcut-platform'

type UpdateCheckClickEvent = Pick<MouseEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>

export function getUpdateCheckHint(isMac = getShortcutPlatform() === 'darwin'): string {
  const rcClickLabel = isMac ? '⇧+click' : 'Shift+click'
  const perfClickLabel = isMac ? '⌘+click' : 'Ctrl+click'
  const releaseHints = `${rcClickLabel} checks the latest RC; ${perfClickLabel} checks the latest perf build.`
  return isMac ? `${releaseHints} ⌥+click chooses a local macOS build.` : releaseHints
}

export function getUpdateCheckClickOptions(
  event: UpdateCheckClickEvent,
  isMac = getShortcutPlatform() === 'darwin'
): UpdateCheckOptions {
  if (isMac && event.altKey) {
    return { localBuild: true }
  }
  return {
    includePrerelease: event.shiftKey,
    includePerfPrerelease: isMac ? event.metaKey : event.ctrlKey
  }
}

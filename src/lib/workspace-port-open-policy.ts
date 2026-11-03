// Ported from Orca (`renderer/src/lib/workspace-port-actions.ts`).
//
// The browser-target policy is pure and has no runtime dependencies; keeping it
// in its own module lets the sidebar card render the port row without pulling
// the activation/RPC graph into its import chain.
export type PortOpenSettings =
  | { openLinksInApp?: boolean | null }
  | null
  | undefined

export function shouldOpenWorkspacePortInOrcaBrowser(settings: PortOpenSettings): boolean {
  return settings?.openLinksInApp === true
}

function isMacShortcutPlatform(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
}

export function getPortSystemBrowserHint(isMac: boolean = isMacShortcutPlatform()): string {
  return isMac ? '⇧⌘+click for system browser' : 'Shift+Ctrl+click for system browser'
}

export function getPortOpenBrowserTooltipLabel(openLabel: string, isMac?: boolean): string {
  return `${openLabel}. ${getPortSystemBrowserHint(isMac)}`
}

export type PortOpenClickEvent = Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey'>

export function resolvePortOpenInOrcaBrowser({
  settings,
  event,
  isMac
}: {
  settings: PortOpenSettings
  event?: PortOpenClickEvent | null
  isMac: boolean
}): boolean {
  // Why: Shift+Cmd/Ctrl is the external-browser escape hatch; no pointer
  // event means context-menu and keyboard opens should keep the saved setting.
  if (event?.shiftKey && (isMac ? event.metaKey : event.ctrlKey)) {
    return false
  }
  return shouldOpenWorkspacePortInOrcaBrowser(settings)
}

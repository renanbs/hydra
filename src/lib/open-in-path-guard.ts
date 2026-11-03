// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Sources: lib/local-path-open-guard.ts, lib/external-editor-open-capability.ts,
// lib/local-file-manager-label.ts, and the openWorktreePath half of
// components/sidebar/WorktreeOpenInMenu.tsx.
//
// Why one module: every "Open in" entry now shares the same preflight. A local OS
// open receives a client filesystem path, so a remote runtime or SSH workspace must
// be blocked with an actionable toast *before* the IPC call instead of failing in
// the Tauri process where the user only sees a raw error string.
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'

import { translate } from '@/i18n/i18n'
import type { HydraSettings } from '../shared/settings-types'
import { isVsCodeRemoteSshCommand } from '../shared/vscode-remote-ssh-launcher'

export type OpenInTarget = 'file-manager' | 'external-editor'

export type ExternalEditorOpenCapability =
  | { allowed: true; remote: boolean }
  | { allowed: false; reason: 'remote-runtime' | 'local-only-editor' }

export type OpenWorktreePathFailure =
  | 'remote-runtime-unsupported'
  | 'remote-editor-unsupported'
  | 'remote-path-invalid'
  | 'local-path-invalid'
  | 'not-found'
  | 'launch-failed'

export function isLocalPathOpenBlocked(
  settings: Pick<HydraSettings, 'activeRuntimeEnvironmentId'> | null | undefined,
  context?: { connectionId?: string | null }
): boolean {
  return Boolean(settings?.activeRuntimeEnvironmentId?.trim() || context?.connectionId?.trim())
}

export function showLocalPathOpenBlockedToast(): void {
  toast.error(
    translate(
      'auto.lib.local.path.open.guard.edc1908653',
      'Opening remote paths in the local OS is not available.'
    )
  )
}

export function getExternalEditorOpenCapability(
  settings: Pick<HydraSettings, 'activeRuntimeEnvironmentId'> | null | undefined,
  context: { connectionId?: string | null; command?: string | undefined }
): ExternalEditorOpenCapability {
  if (settings?.activeRuntimeEnvironmentId?.trim()) {
    return { allowed: false, reason: 'remote-runtime' }
  }
  if (!context.connectionId?.trim()) {
    return { allowed: true, remote: false }
  }
  return isVsCodeRemoteSshCommand(context.command)
    ? { allowed: true, remote: true }
    : { allowed: false, reason: 'local-only-editor' }
}

export function getLocalFileManagerLabel(userAgent?: string): string {
  const resolvedUserAgent =
    userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent)
  if (resolvedUserAgent.includes('Mac')) {
    return 'Finder'
  }
  if (resolvedUserAgent.includes('Windows')) {
    return 'File Explorer'
  }
  return 'File Manager'
}

/**
 * The OS cannot resolve a relative path for either target. Windows drive letters
 * and UNC prefixes are absolute too, even though the backend runs on Linux.
 */
export function isAbsoluteWorkspacePath(path: string): boolean {
  const trimmed = path.trim()
  return (
    trimmed.startsWith('/') ||
    trimmed.startsWith('\\\\') ||
    /^[a-z]:[\\/]/i.test(trimmed)
  )
}

export function getOpenWorktreePathFailure(args: {
  target: OpenInTarget
  worktreePath: string
  settings?: Pick<HydraSettings, 'activeRuntimeEnvironmentId'> | null
  connectionId?: string | null
  command?: string | undefined
}): Exclude<OpenWorktreePathFailure, 'launch-failed'> | null {
  if (!isAbsoluteWorkspacePath(args.worktreePath)) {
    return args.connectionId?.trim() ? 'remote-path-invalid' : 'local-path-invalid'
  }
  if (args.target === 'file-manager') {
    return isLocalPathOpenBlocked(args.settings, { connectionId: args.connectionId })
      ? 'remote-runtime-unsupported'
      : null
  }
  const capability = getExternalEditorOpenCapability(args.settings, {
    connectionId: args.connectionId,
    command: args.command
  })
  if (!capability.allowed) {
    return capability.reason === 'remote-runtime'
      ? 'remote-runtime-unsupported'
      : 'remote-editor-unsupported'
  }
  return null
}

function showOpenFailureToast(reason: OpenWorktreePathFailure, remote: boolean): void {
  if (reason === 'remote-runtime-unsupported') {
    toast.error(
      translate(
        'auto.components.sidebar.WorktreeOpenInMenu.remoteRuntimeUnsupported',
        'Opening this path in a local app is not available.'
      ),
      {
        description: translate(
          'auto.components.sidebar.WorktreeOpenInMenu.remoteRuntimeUnsupportedDetail',
          'Switch to a local or SSH workspace, then try again.'
        )
      }
    )
    return
  }
  if (reason === 'remote-editor-unsupported') {
    toast.error(
      translate(
        'auto.components.sidebar.WorktreeOpenInMenu.remoteEditorUnsupported',
        'This app cannot open SSH workspaces.'
      ),
      {
        description: translate(
          'auto.components.sidebar.WorktreeOpenInMenu.remoteEditorUnsupportedDetail',
          'Choose VS Code or use the app locally.'
        )
      }
    )
    return
  }
  if (reason === 'remote-path-invalid') {
    toast.error(
      translate(
        'auto.components.sidebar.WorktreeOpenInMenu.remotePathInvalid',
        'Path is not valid for the SSH host.'
      ),
      {
        description: translate(
          'auto.components.sidebar.WorktreeOpenInMenu.remotePathInvalidDetail',
          'Refresh the workspace before trying again.'
        )
      }
    )
    return
  }
  if (reason === 'local-path-invalid') {
    toast.error(
      translate(
        'auto.components.sidebar.WorktreeOpenInMenu.f387af445b',
        'Workspace path is not a valid local path.'
      )
    )
    return
  }
  if (remote) {
    toast.error(
      translate(
        'auto.components.sidebar.WorktreeOpenInMenu.remoteLaunchFailed',
        'Could not open the path in VS Code.'
      ),
      {
        description: translate(
          'auto.components.sidebar.WorktreeOpenInMenu.remoteLaunchFailedDetail',
          'Check the VS Code command configured on this machine.'
        )
      }
    )
    return
  }
  toast.error(
    translate(
      'auto.components.sidebar.WorktreeOpenInMenu.9a5381eb09',
      'Could not open workspace folder.'
    ),
    {
      description: translate(
        'auto.components.sidebar.WorktreeOpenInMenu.bd0e8159f8',
        'Check the editor command or file manager configuration on this machine.'
      )
    }
  )
}

/**
 * Preflight + IPC for every "Open in" entry. The Tauri commands answer with an
 * untyped error string, so a rejection is reported through the same actionable
 * copy rather than surfaced raw.
 */
export async function openWorktreePath(args: {
  target: OpenInTarget
  worktreePath: string
  settings?: Pick<HydraSettings, 'activeRuntimeEnvironmentId'> | null
  connectionId?: string | null
  command?: string | undefined
}): Promise<void> {
  const remote = Boolean(args.connectionId?.trim())
  const failure = getOpenWorktreePathFailure(args)
  if (failure) {
    if (failure === 'remote-runtime-unsupported' && args.target === 'file-manager') {
      showLocalPathOpenBlockedToast()
      return
    }
    showOpenFailureToast(failure, remote)
    return
  }

  try {
    if (args.target === 'file-manager') {
      await invoke('open_in_file_manager', { path: args.worktreePath })
      return
    }
    if (!args.command?.trim()) {
      showOpenFailureToast(remote ? 'remote-editor-unsupported' : 'launch-failed', remote)
      return
    }
    // Why no connectionId: the backend has no remote-open command yet. The
    // capability gate above only lets VS Code through for SSH, so this call keeps
    // the local launcher contract and reports a rejected launch instead of
    // silently opening the wrong path.
    await invoke('open_in_external_editor', {
      path: args.worktreePath,
      command: args.command
    })
  } catch {
    showOpenFailureToast(remote ? 'remote-editor-unsupported' : 'launch-failed', remote)
  }
}

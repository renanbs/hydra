// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: shared/vscode-remote-ssh-launcher.ts
// Why: an SSH workspace path is only openable from the client when the configured
// editor is VS Code, whose Remote-SSH launcher accepts `host:/path`. The menu must
// not offer "Remote SSH" for an editor that cannot cross the host boundary.
const VSCODE_LAUNCHER_NAMES: Record<string, true> = {
  code: true,
  'code-insiders': true,
  'code - insiders': true
}
const WINDOWS_ABSOLUTE_PATH = /^(?:[a-z]:[\\/]|\\\\)/i

function stripMatchingQuotes(value: string): string {
  const trimmed = value.trim()
  const quote = trimmed[0]
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function isVsCodeLauncherExecutable(command: string): boolean {
  const unquoted = stripMatchingQuotes(command)
  const segments = unquoted.split(/[\\/]/)
  const fileName = segments.at(-1) ?? ''
  const launcherName = fileName.replace(/\.(?:cmd|exe|bat)$/i, '').toLowerCase()
  return VSCODE_LAUNCHER_NAMES[launcherName] === true
}

export function isVsCodeRemoteSshCommand(command: string | undefined): boolean {
  const trimmed = command?.trim() || 'code'
  const unquoted = stripMatchingQuotes(trimmed)
  if (!/\s/.test(unquoted)) {
    return isVsCodeLauncherExecutable(unquoted)
  }

  const isAbsolutePath = unquoted.startsWith('/') || WINDOWS_ABSOLUTE_PATH.test(unquoted)
  return isAbsolutePath && isVsCodeLauncherExecutable(unquoted)
}

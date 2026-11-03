import { invoke } from '@tauri-apps/api/core'
import type { ClientEnvironmentInfo } from '../shared/client-environment-info'
import { getRendererAppPlatform } from './renderer-app-platform'

/**
 * Resolve trusted desktop env details for bug reports.
 *
 * Hydra has no preload bridge, so the version comes from the real
 * `get_app_version` Tauri command and platform/arch come from the renderer.
 * Shell is supplied by the caller when the settings snapshot knows it.
 */
export async function resolveClientEnvironmentInfo(shell?: string): Promise<ClientEnvironmentInfo> {
  const appVersion = await resolveAppVersion()
  return {
    appVersion,
    platform: resolveFallbackPlatform(),
    osRelease: resolveOsRelease(),
    arch: resolveArch(),
    ...(shell && shell.trim() ? { shell: shell.trim() } : {})
  }
}

function resolveFallbackPlatform(): string {
  try {
    return getRendererAppPlatform()
  } catch {
    return 'unknown'
  }
}

function resolveOsRelease(): string {
  try {
    const match = /Android ([\d.]+)/.exec(navigator.userAgent)
    if (match) return match[1]
  } catch {
    // Best-effort only.
  }
  return ''
}

function resolveArch(): string {
  try {
    const ua = navigator.userAgent
    if (/aarch64|arm64/i.test(ua)) return 'arm64'
    if (/x86_64|Win64|x64/i.test(ua)) return 'x86_64'
  } catch {
    // Best-effort only.
  }
  return ''
}

async function resolveAppVersion(): Promise<string> {
  try {
    const version = await invoke<string>('get_app_version')
    if (typeof version === 'string' && version.trim()) {
      return version.trim()
    }
  } catch {
    // Best-effort: feedback/error copy should still show OS details.
  }
  return 'unknown'
}

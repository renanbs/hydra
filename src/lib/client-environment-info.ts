import { invoke } from '@tauri-apps/api/core'
import {
  formatClientEnvironmentFooter,
  type ClientEnvironmentInfo
} from '../shared/client-environment-info'
import { getRendererAppPlatform } from './renderer-app-platform'

type UserAgentDataLike = {
  platformVersion?: string
  architecture?: string
  bitness?: string
}

function resolveArchitecture(): string {
  const userAgentData = (navigator as Navigator & { userAgentData?: UserAgentDataLike })
    .userAgentData
  const fromClient = userAgentData?.architecture?.trim()
  if (fromClient) {
    const bitness = userAgentData?.bitness?.trim()
    return bitness ? `${fromClient}${bitness}` : fromClient
  }
  const platform = typeof navigator === 'undefined' ? '' : navigator.platform
  if (/x86_64|amd64|win64/i.test(platform)) return 'x64'
  if (/aarch64|arm64/i.test(platform)) return 'arm64'
  if (/arm/i.test(platform)) return 'arm'
  return ''
}

function resolveOsRelease(): string {
  const userAgentData = (navigator as Navigator & { userAgentData?: UserAgentDataLike })
    .userAgentData
  const fromClient = userAgentData?.platformVersion?.trim()
  if (fromClient) return fromClient
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent
  // Why: only the OS token is useful for a bug report; the WebKit/Gecko build
  // string that follows would just add noise. Best-effort, never throws.
  const osToken = /(?:Linux|Windows NT|Mac OS X)\s?[^;)]*/i.exec(userAgent)?.[0]?.trim()
  return osToken ?? ''
}

async function resolveAppVersion(): Promise<string> {
  try {
    const version = await invoke<string>('get_app_version')
    if (typeof version === 'string' && version.trim()) return version.trim()
  } catch {
    // Best-effort: feedback copy should still show OS details.
  }
  return 'unknown'
}

/** Resolve trusted desktop env details (or browser best-effort) for bug reports. */
export async function resolveClientEnvironmentInfo(): Promise<ClientEnvironmentInfo> {
  return {
    appVersion: await resolveAppVersion(),
    platform: getRendererAppPlatform(),
    osRelease: resolveOsRelease(),
    arch: resolveArchitecture(),
  }
}

export async function resolveClientEnvironmentFooter(): Promise<string> {
  return formatClientEnvironmentFooter(await resolveClientEnvironmentInfo())
}

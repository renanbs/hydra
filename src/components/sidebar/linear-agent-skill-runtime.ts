// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/linear-agent-skill-runtime.ts
import type { GlobalSettings } from '../../shared/global-settings-types'
import type { ProjectExecutionRuntimeResolution } from '../../shared/project-execution-runtime'
import type { SkillDiscoveryTarget } from '../../shared/skills'
import { translate } from '@/i18n/i18n'
import {
  getProjectAgentSkillRuntime,
  getProjectAgentSkillTerminalShellOverride
} from '@/lib/project-skill-runtime'

const LOCAL_DISMISS_STORAGE_KEY_PREFIX = 'orca.linearTicketsSkill.setupDismissed'

export type LinearAgentRuntime = {
  runtime: 'host' | 'wsl'
  wslDistro?: string | null
  label: string
}

export type LinearAgentSkillPromptSettings = Pick<
  GlobalSettings,
  | 'localAgentRuntime'
  | 'localAgentWslDistro'
  | 'terminalWindowsShell'
  | 'activeRuntimeEnvironmentId'
>

export function getCurrentPlatform(): NodeJS.Platform {
  if (navigator.userAgent.includes('Windows')) return 'win32'
  return navigator.userAgent.includes('Linux') ? 'linux' : 'darwin'
}

function getWslAgentRuntime(distro: string | null): LinearAgentRuntime {
  return {
    runtime: 'wsl',
    wslDistro: distro,
    label: distro
      ? `WSL ${distro}`
      : translate('auto.components.sidebar.LinearAgentSkillSetupPrompt.wslLabel', 'WSL default')
  }
}

/**
 * Resolve where the Linear skill must be installed. Remote environments always
 * target the local host terminal; a project runtime wins over the global
 * preference so Windows and WSL never share setup state by accident.
 */
export function getLinearPromptAgentRuntime(
  settings: LinearAgentSkillPromptSettings | null | undefined,
  currentPlatform: NodeJS.Platform,
  remote: boolean,
  projectRuntime?: ProjectExecutionRuntimeResolution
): LinearAgentRuntime {
  if (remote) {
    return {
      runtime: 'host',
      label: currentPlatform === 'win32' ? 'Windows' : 'This device'
    }
  }
  const resolvedProjectRuntime = getProjectAgentSkillRuntime(projectRuntime, currentPlatform)
  if (resolvedProjectRuntime) return resolvedProjectRuntime

  const selectedRuntime = settings?.localAgentRuntime ?? 'host'
  if (currentPlatform === 'win32' && selectedRuntime === 'wsl') {
    return getWslAgentRuntime(settings?.localAgentWslDistro?.trim() || null)
  }
  return {
    runtime: 'host',
    label: currentPlatform === 'win32' ? 'Windows' : 'This device'
  }
}

export function getLinearPromptTerminalShellOverride(
  currentPlatform: NodeJS.Platform,
  settings: LinearAgentSkillPromptSettings | null | undefined,
  runtime: LinearAgentRuntime
): string | undefined {
  return getProjectAgentSkillTerminalShellOverride(currentPlatform, settings, runtime)
}

/** Identity for discarding stale CLI/skill checks when the runtime target changes. */
export function getLinearPromptSetupCheckIdentity(args: {
  remote: boolean
  runtime: LinearAgentRuntime
  projectRuntime?: ProjectExecutionRuntimeResolution
  activeRuntimeEnvironmentId?: string | null
}): string {
  return JSON.stringify({
    remote: args.remote,
    runtime: args.runtime.runtime,
    wslDistro: args.runtime.wslDistro ?? null,
    projectRuntime: args.projectRuntime
      ? args.projectRuntime.status === 'resolved'
        ? args.projectRuntime.runtime.cacheKey
        : args.projectRuntime.repair.cacheKey
      : null,
    activeRuntimeEnvironmentId: args.activeRuntimeEnvironmentId ?? null
  })
}

export function getLinearPromptSkillDiscoveryTarget(
  runtime: LinearAgentRuntime,
  projectRuntime?: ProjectExecutionRuntimeResolution
): SkillDiscoveryTarget | undefined {
  if (projectRuntime) return { projectRuntime }
  return runtime.runtime === 'wsl'
    ? { runtime: 'wsl', wslDistro: runtime.wslDistro }
    : undefined
}

/** Per-runtime dismissal key so dismissing Windows setup does not silence WSL. */
export function getLocalDismissStorageKey(runtime: LinearAgentRuntime): string {
  if (runtime.runtime !== 'wsl') return `${LOCAL_DISMISS_STORAGE_KEY_PREFIX}.host`
  return `${LOCAL_DISMISS_STORAGE_KEY_PREFIX}.wsl.${runtime.wslDistro?.trim() || 'default'}`
}

export function readLocalDismissed(storageKey: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(storageKey) === '1'
}

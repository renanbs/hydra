// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import type { ProviderRateLimits } from '../../shared/rate-limit-types'
import { useAppStore } from '../../store'
// CodexSwitcherController is locally defined below

// useCodexSwitcherController: Central controller state for the Codex status bar
// segment, active-target selection and account sync.

export interface CodexSwitcherController {
  codex: ProviderRateLimits | null
  codexTarget: ProviderRateLimits | null
  codexAccounts: { accounts: unknown[]; activeAccountId: string | null }
  activeRuntimeEnvironmentId: string | null
  compact: boolean
  iconOnly: boolean
  onCodexTargetChange: (target: string) => void
}

export function useCodexSwitcherController({
  compact = false,
  iconOnly = false
}: {
  compact?: boolean
  iconOnly?: boolean
}): CodexSwitcherController {
  const codex = useAppStore((s) => s.rateLimits.codex) || null
  const codexTarget = useAppStore((s) => s.rateLimits.codexTarget) || null

  return {
    codex,
    codexTarget,
    codexAccounts: { accounts: [], activeAccountId: null },
    activeRuntimeEnvironmentId: null,
    compact,
    iconOnly,
    onCodexTargetChange: () => {}
  }
}

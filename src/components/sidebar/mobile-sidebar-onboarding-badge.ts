// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/mobile-sidebar-onboarding-badge.ts
import { useCallback, useState } from 'react'

const DISMISS_KEY = 'hydra.mobile.sidebar-onboarding-dismissed'

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function shouldShowMobileSidebarOnboardingBadge(
  enabled: boolean,
  dismissed: boolean
): boolean {
  return enabled && !dismissed
}

/**
 * One-time "New" badge on the Orca Mobile entry until its first view.
 *
 * `hasPairedDevice` stays false because Hydra has no command that lists paired
 * mobile devices; the inline hide affordance waits for that surface instead of
 * guessing from a QR generation.
 */
export function useMobileSidebarOnboardingBadge(enabled = true): {
  visible: boolean
  hasPairedDevice: boolean
  dismiss: () => void
} {
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed())

  const dismiss = useCallback(() => {
    if (dismissed) {
      return
    }
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Best-effort; if storage is unavailable the badge will reappear next mount.
    }
    setDismissed(true)
  }, [dismissed])

  return {
    visible: shouldShowMobileSidebarOnboardingBadge(enabled, dismissed),
    hasPairedDevice: false,
    dismiss
  }
}

// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/mobile-sidebar-onboarding-badge.ts
// Reference: `src/reference/components/sidebar/mobile-sidebar-onboarding-badge.ts`
// (verbatim Orca, pinned in `src/reference/REVISION`). D01-024: the badge and
// inline hide read the live paired-device list instead of a hardcoded false.
import { useCallback, useState } from 'react'
import { usePairedMobileDevices } from '../mobile/paired-mobile-devices'

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
 * `hasPairedDevice` reads the live device list; the inline EyeOff shows once a
 * device is paired (Orca `hasPairedDevice` gate on the hide affordance).
 */
export function useMobileSidebarOnboardingBadge(enabled = true): {
  visible: boolean
  hasPairedDevice: boolean
  dismiss: () => void
} {
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed())
  const mobileDevices = usePairedMobileDevices({ enabled })

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
    visible:
      shouldShowMobileSidebarOnboardingBadge(enabled, dismissed) &&
      mobileDevices.loaded &&
      !mobileDevices.error &&
      !mobileDevices.hasPairedDevice,
    hasPairedDevice: mobileDevices.hasPairedDevice,
    dismiss
  }
}

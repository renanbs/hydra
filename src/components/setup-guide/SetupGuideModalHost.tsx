// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/setup-guide/SetupGuideModal.tsx (mount gating)
import { useEffect, useState, type JSX } from 'react'
import type { HydraSettings } from '../../shared/settings-types'
import { isFeatureWallSetupStepId } from '../../shared/feature-wall-setup-steps'
import { useSidebarUiStore } from '../sidebar/sidebar-ui-store'
import { SetupGuideModal } from './SetupGuideModal'

const SETUP_GUIDE_CLOSE_LINGER_MS = 300

/**
 * Mounts the onboarding checklist for `openModal('setup-guide', { setupStepId?, telemetrySource? })`.
 *
 * Why it lives at the App shell: the sidebar entry and the Help menu both open the
 * modal, and hiding the sidebar must not unmount an open checklist.
 */
export function SetupGuideModalHost({
  settings
}: {
  settings: HydraSettings | null
}): JSX.Element | null {
  const activeModal = useSidebarUiStore((state) => state.activeModal)
  const modalData = useSidebarUiStore((state) => state.modalData)
  const closeModal = useSidebarUiStore((state) => state.closeModal)
  const setSetupGuideSidebarDismissed = useSidebarUiStore(
    (state) => state.setSetupGuideSidebarDismissed
  )
  const open = activeModal === 'setup-guide'
  const [lingering, setLingering] = useState(open)

  useEffect(() => {
    if (open) {
      setLingering(true)
      return
    }
    // Why: Radix unmounts its content the frame `open` flips; the linger keeps the
    // checklist visible through the closing animation instead of snapping blank.
    const timer = window.setTimeout(() => setLingering(false), SETUP_GUIDE_CLOSE_LINGER_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  if (!open && !lingering) {
    return null
  }

  return (
    <SetupGuideModal
      open={open}
      settings={settings}
      requestedStepId={
        isFeatureWallSetupStepId(modalData.setupStepId) ? modalData.setupStepId : null
      }
      telemetrySource={
        typeof modalData.telemetrySource === 'string' ? modalData.telemetrySource : 'unknown'
      }
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeModal()
        }
      }}
      onHideFromSidebar={() => {
        setSetupGuideSidebarDismissed(true)
      }}
    />
  )
}

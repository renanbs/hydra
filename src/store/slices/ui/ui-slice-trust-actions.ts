import type { UISlice, UISliceGet, UISliceSet } from './ui-slice-contract'
import { getSetupScriptPromptDismissalKey } from '../../../lib/setup-script-prompt'

export function createUiTrustActions(set: UISliceSet, _get: UISliceGet): Partial<UISlice> {
  return {
    trustedOrcaHooks: {},
    markOrcaHookScriptConfirmed: (repoId: any, kind: any, contentHash: any) =>
      set((s: any) => {
        const existing = s.trustedOrcaHooks[repoId]
        const currentEntry = existing?.[kind]
        if (currentEntry?.contentHash === contentHash) {
          return s
        }
        const nextRepo = {
          ...existing,
          [kind]: { contentHash, approvedAt: Date.now() }
        }
        const next = { ...s.trustedOrcaHooks, [repoId]: nextRepo }
        window.api.ui.set({ trustedOrcaHooks: next }).catch(console.error)
        return { trustedOrcaHooks: next }
      }),
    markOrcaHookRepoAlwaysTrusted: (repoId: any) =>
      set((s: any) => {
        const existing = s.trustedOrcaHooks[repoId]
        if (existing?.all) {
          return s
        }
        const next = {
          ...s.trustedOrcaHooks,
          [repoId]: {
            ...existing,
            all: { approvedAt: Date.now() }
          }
        }
        window.api.ui.set({ trustedOrcaHooks: next }).catch(console.error)
        return { trustedOrcaHooks: next }
      }),
    clearOrcaHookTrustForRepo: (repoId: any) =>
      set((s: any) => {
        if (!(repoId in s.trustedOrcaHooks)) {
          return s
        }
        const next = { ...s.trustedOrcaHooks }
        delete next[repoId]
        window.api.ui.set({ trustedOrcaHooks: next }).catch(console.error)
        return { trustedOrcaHooks: next }
      }),
    setupScriptPromptDismissedRepoIds: [],
    dismissSetupScriptPrompt: (repoHostIdentity: any) =>
      set((s: any) => {
        const dismissalKey = getSetupScriptPromptDismissalKey(repoHostIdentity)
        if (!repoHostIdentity || s.setupScriptPromptDismissedRepoIds.includes(dismissalKey)) {
          return s
        }
        const next = [...s.setupScriptPromptDismissedRepoIds, dismissalKey]
        window.api.ui.set({ setupScriptPromptDismissedRepoIds: next }).catch(console.error)
        return { setupScriptPromptDismissedRepoIds: next }
      }),
    setupGuideSidebarDismissed: false,
    setSetupGuideSidebarDismissed: (dismissed: any) =>
      set((s: any) => {
        if (s.setupGuideSidebarDismissed === dismissed) {
          return s
        }
        window.api.ui.set({ setupGuideSidebarDismissed: dismissed }).catch(console.error)
        return { setupGuideSidebarDismissed: dismissed }
      }),
    setupGuideBrowserMilestoneMigrated: true,
    setupGuideBrowserMilestoneLegacyComplete: false,
    markSetupGuideBrowserMilestoneMigrated: (legacyComplete: any) =>
      set((s: any) => {
        if (
          s.setupGuideBrowserMilestoneMigrated &&
          s.setupGuideBrowserMilestoneLegacyComplete === legacyComplete
        ) {
          return s
        }
        const updates = {
          setupGuideBrowserMilestoneMigrated: true,
          setupGuideBrowserMilestoneLegacyComplete: legacyComplete
        }
        window.api.ui.set(updates).catch(console.error)
        return updates
      }),
    browserImportHintHidden: false,
    setBrowserImportHintHidden: (hidden: any) =>
      set((s: any) => {
        if (s.browserImportHintHidden === hidden) {
          return s
        }
        window.api.ui.set({ browserImportHintHidden: hidden }).catch(console.error)
        return { browserImportHintHidden: hidden }
      }),
    mobileEmulatorTabIntroDismissed: false,
    dismissMobileEmulatorTabIntro: () =>
      set((s: any) => {
        if (s.mobileEmulatorTabIntroDismissed) {
          return s
        }
        window.api.ui.set({ mobileEmulatorTabIntroDismissed: true }).catch(console.error)
        return { mobileEmulatorTabIntroDismissed: true }
      }),
    mobileEmulatorAgentSetupDismissed: false,
    dismissMobileEmulatorAgentSetup: () =>
      set((s: any) => {
        if (s.mobileEmulatorAgentSetupDismissed) {
          return s
        }
        window.api.ui.set({ mobileEmulatorAgentSetupDismissed: true }).catch(console.error)
        return { mobileEmulatorAgentSetupDismissed: true }
      }),
    projectOrderManualDefaultNoticeDismissed: true,
    dismissProjectOrderManualDefaultNotice: () =>
      set((s: any) => {
        if (s.projectOrderManualDefaultNoticeDismissed) {
          return s
        }
        window.api.ui.set({ projectOrderManualDefaultNoticeDismissed: true }).catch(console.error)
        return { projectOrderManualDefaultNoticeDismissed: true }
      }),
    // Why: default true so pre-hydration / new sessions never flash the change notice before persistence resolves.
    usagePercentageDisplayChangeNoticeDismissed: true,
    dismissUsagePercentageDisplayChangeNotice: () =>
      set((s: any) => {
        if (s.usagePercentageDisplayChangeNoticeDismissed) {
          return s
        }
        window.api.ui
          .set({ usagePercentageDisplayChangeNoticeDismissed: true })
          .catch(console.error)
        return { usagePercentageDisplayChangeNoticeDismissed: true }
      }),
    usageEmptyStateDismissed: false,
    dismissUsageEmptyState: () =>
      set((s: any) => {
        if (s.usageEmptyStateDismissed) {
          return s
        }
        window.api.ui.set({ usageEmptyStateDismissed: true }).catch(console.error)
        return { usageEmptyStateDismissed: true }
      })
  }
}

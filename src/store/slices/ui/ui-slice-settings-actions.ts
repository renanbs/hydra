import type { UISlice, UISliceGet, UISliceSet } from './ui-slice-contract'
import { isSettingsNavigationTarget } from '../../../lib/settings-navigation-types'

export function createUiSettingsActions(set: UISliceSet, get: UISliceGet): Partial<UISlice> {
  return {
    openSettingsPage: () => {
      // Why: settings search is a transient filter; opening Settings shouldn't inherit hidden sections from last visit.
      get().setSettingsSearchQuery('')
      set((state: any) => ({
        activeView: 'settings',
        // Why: preserve the originating view so Settings back returns there (e.g. in-progress draft), not always terminal.
        previousViewBeforeSettings:
          state.activeView === 'settings' ? state.previousViewBeforeSettings : state.activeView
      }))
    },
    closeSettingsPage: () =>
      set((state: any) => {
        return { activeView: state.previousViewBeforeSettings }
      }),
    settingsNavigationTarget: null,
    openSettingsTarget: (target: any) => {
      if (!isSettingsNavigationTarget(target)) {
        if (import.meta.env.DEV) {
          throw new TypeError('openSettingsTarget received an invalid navigation target')
        }
        return
      }
      set({ settingsNavigationTarget: target })
    },
    clearSettingsTarget: () => set({ settingsNavigationTarget: null }),
    settingsProjectHostSelection: {},
    settingsProjectSetupSelection: {},
    // Why: renderer-only, never persisted — no window.api.ui.set, and absent from the debounced UI writer in App.tsx.
    setSettingsProjectHostSelection: (projectId: any, hostId: any, setupId: any) =>
      set((s: any) => {
        const nextSetupSelections = { ...s.settingsProjectSetupSelection }
        if (setupId) {
          nextSetupSelections[projectId] = setupId
        } else {
          delete nextSetupSelections[projectId]
        }
        if (
          s.settingsProjectHostSelection[projectId] === hostId &&
          s.settingsProjectSetupSelection[projectId] === setupId
        ) {
          return s
        }
        return {
          settingsProjectHostSelection: {
            ...s.settingsProjectHostSelection,
            [projectId]: hostId
          },
          settingsProjectSetupSelection: nextSetupSelections
        }
      }),
    appearanceAccordionDeepLink: null,
    setAppearanceAccordionDeepLink: (section: any) => set({ appearanceAccordionDeepLink: section }),
    clearAppearanceAccordionDeepLink: () => set({ appearanceAccordionDeepLink: null })
  }
}

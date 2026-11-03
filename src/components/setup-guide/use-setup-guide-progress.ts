// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/setup-guide/use-setup-guide-progress.ts
//
// Hydra adaptation: Orca derives the checklist from runtime probes (hooks, permission
// helpers, provider checks). This branch does not own those probes yet, so the hook
// reads persisted evidence only (settings, feature interactions, repo hook settings and
// the Orca CLI setup marker) and is ready as soon as persisted UI hydration lands.
import { useEffect, useMemo, useState } from 'react'
import type { HydraSettings } from '../../shared/settings-types'
import { useSidebarUiStore } from '../sidebar/sidebar-ui-store'
import {
  isOrchestrationSetupEnabled,
  ORCHESTRATION_SETUP_STATE_EVENT
} from '@/lib/orchestration-setup-state'
import { hasFeatureInteraction } from '../../shared/feature-interactions'
import {
  getFeatureWallSetupProgress,
  type FeatureWallSetupProgress
} from './feature-wall-setup-progress'
import {
  getSetupGuideBrowserMilestoneAwareProgress,
  shouldMarkBrowserMilestoneLegacyComplete
} from './setup-guide-browser-milestone-progress'

export function useSetupGuideProgress(
  settings: HydraSettings | null | undefined,
  enabled = true
): FeatureWallSetupProgress {
  // Why the sidebar adapter: the composed UI slice is still typed `any` on this
  // branch, so the store's public interface does not name these members.
  const persistedUIReady = useSidebarUiStore((state) => state.persistedUIReady)
  const featureInteractions = useSidebarUiStore((state) => state.featureInteractions)
  const repos = useSidebarUiStore((state) => state.repos)
  const worktreesByRepo = useSidebarUiStore((state) => state.worktreesByRepo)
  const setupGuideSidebarDismissed = useSidebarUiStore(
    (state) => state.setupGuideSidebarDismissed
  )
  const browserMilestoneMigrated = useSidebarUiStore(
    (state) => state.setupGuideBrowserMilestoneMigrated
  )
  const browserMilestoneLegacyComplete = useSidebarUiStore(
    (state) => state.setupGuideBrowserMilestoneLegacyComplete
  )
  const markBrowserMilestoneMigrated = useSidebarUiStore(
    (state) => state.markSetupGuideBrowserMilestoneMigrated
  )
  const [orchestrationSetupEnabled, setOrchestrationSetupEnabled] = useState(
    isOrchestrationSetupEnabled
  )

  useEffect(() => {
    if (!enabled) {
      return
    }
    const refresh = (): void => {
      setOrchestrationSetupEnabled(isOrchestrationSetupEnabled())
    }
    // Why: the CLI setup terminal writes its marker from another pane; re-read on
    // the marker event so the checklist updates without a remount.
    refresh()
    window.addEventListener(ORCHESTRATION_SETUP_STATE_EVENT, refresh)
    return () => window.removeEventListener(ORCHESTRATION_SETUP_STATE_EVENT, refresh)
  }, [enabled])

  const ready = enabled && Boolean(settings) && persistedUIReady
  const rawProgress = useMemo(
    () =>
      getFeatureWallSetupProgress({
        ready,
        settings: settings ?? null,
        featureInteractions,
        repos,
        worktreesByRepo,
        orchestrationSetupEnabled
      }),
    [ready, settings, featureInteractions, repos, worktreesByRepo, orchestrationSetupEnabled]
  )
  const historicalSplitTerminalDone = hasFeatureInteraction(
    featureInteractions,
    'terminal-pane-split'
  )
  const pendingLegacyComplete =
    !browserMilestoneMigrated && rawProgress.ready
      ? shouldMarkBrowserMilestoneLegacyComplete({
          stepDone: rawProgress.stepDone,
          historicalSplitTerminalDone,
          setupGuideSidebarDismissed
        })
      : false
  const effectiveLegacyComplete = browserMilestoneLegacyComplete || pendingLegacyComplete

  useEffect(() => {
    if (browserMilestoneMigrated || !rawProgress.ready) {
      return
    }
    markBrowserMilestoneMigrated(pendingLegacyComplete)
  }, [
    browserMilestoneMigrated,
    markBrowserMilestoneMigrated,
    pendingLegacyComplete,
    rawProgress.ready
  ])

  return useMemo(
    () => getSetupGuideBrowserMilestoneAwareProgress(rawProgress, effectiveLegacyComplete),
    [effectiveLegacyComplete, rawProgress]
  )
}

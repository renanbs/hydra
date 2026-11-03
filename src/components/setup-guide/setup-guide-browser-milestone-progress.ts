// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/setup-guide/setup-guide-browser-milestone-progress.ts
import {
  FEATURE_WALL_SETUP_STEPS,
  type FeatureWallSetupStepId
} from '../../shared/feature-wall-setup-steps'
import type { FeatureWallSetupProgress } from './feature-wall-setup-progress'

export function shouldMarkBrowserMilestoneLegacyComplete(input: {
  stepDone: Partial<Record<FeatureWallSetupStepId, boolean>>
  historicalSplitTerminalDone: boolean
  setupGuideSidebarDismissed: boolean
}): boolean {
  if (input.setupGuideSidebarDismissed) {
    return true
  }
  // Why: the browser migration preserves the old pre-browser checklist, which
  // included the now-removed split-terminal milestone.
  return (
    input.historicalSplitTerminalDone &&
    FEATURE_WALL_SETUP_STEPS.every((step) => step.id === 'browser' || input.stepDone[step.id])
  )
}

export function getSetupGuideBrowserMilestoneAwareProgress(
  progress: FeatureWallSetupProgress,
  browserMilestoneLegacyComplete: boolean
): FeatureWallSetupProgress {
  if (!browserMilestoneLegacyComplete) {
    return progress
  }
  const stepDone = Object.fromEntries(
    FEATURE_WALL_SETUP_STEPS.map((step) => [step.id, true])
  ) as Record<FeatureWallSetupStepId, boolean>
  // Why: profiles that finished or dismissed the pre-browser checklist keep
  // that prior checklist contract after the browser milestone is introduced.
  return {
    ...progress,
    stepDone,
    coreDoneCount: FEATURE_WALL_SETUP_STEPS.length,
    coreTotal: FEATURE_WALL_SETUP_STEPS.length
  }
}

// Parity guard for D01-017 persisted completion: profiles that finished or
// dismissed the pre-browser checklist keep that contract after the browser
// milestone is introduced.
import { describe, expect, it } from 'vitest'
import { FEATURE_WALL_SETUP_STEPS, type FeatureWallSetupStepId } from '../../shared/feature-wall-setup-steps'
import type { FeatureWallSetupProgress } from './feature-wall-setup-progress'
import {
  getSetupGuideBrowserMilestoneAwareProgress,
  shouldMarkBrowserMilestoneLegacyComplete
} from './setup-guide-browser-milestone-progress'

function allDoneExcept(stepId: FeatureWallSetupStepId): Record<FeatureWallSetupStepId, boolean> {
  return Object.fromEntries(
    FEATURE_WALL_SETUP_STEPS.map((step) => [step.id, step.id !== stepId])
  ) as Record<FeatureWallSetupStepId, boolean>
}

function progressWith(stepDone: Record<FeatureWallSetupStepId, boolean>): FeatureWallSetupProgress {
  const coreDoneCount = Object.values(stepDone).filter(Boolean).length
  return { ready: true, stepDone, coreDoneCount, coreTotal: FEATURE_WALL_SETUP_STEPS.length }
}

describe('browser milestone persisted completion (D01-017)', () => {
  it('marks legacy complete when the sidebar entry was hidden', () => {
    expect(
      shouldMarkBrowserMilestoneLegacyComplete({
        stepDone: allDoneExcept('browser'),
        historicalSplitTerminalDone: false,
        setupGuideSidebarDismissed: true
      })
    ).toBe(true)
  })

  it('marks legacy complete only when the old checklist and split-terminal were done', () => {
    expect(
      shouldMarkBrowserMilestoneLegacyComplete({
        stepDone: allDoneExcept('browser'),
        historicalSplitTerminalDone: true,
        setupGuideSidebarDismissed: false
      })
    ).toBe(true)

    expect(
      shouldMarkBrowserMilestoneLegacyComplete({
        stepDone: allDoneExcept('browser'),
        historicalSplitTerminalDone: false,
        setupGuideSidebarDismissed: false
      })
    ).toBe(false)

    expect(
      shouldMarkBrowserMilestoneLegacyComplete({
        stepDone: allDoneExcept('two-worktrees'),
        historicalSplitTerminalDone: true,
        setupGuideSidebarDismissed: false
      })
    ).toBe(false)
  })

  it('reports the checklist complete when legacy completion is persisted', () => {
    const aware = getSetupGuideBrowserMilestoneAwareProgress(
      progressWith(allDoneExcept('browser')),
      true
    )

    expect(aware.coreDoneCount).toBe(8)
    expect(aware.coreTotal).toBe(8)
    expect(Object.values(aware.stepDone).every(Boolean)).toBe(true)
  })

  it('leaves the live progress untouched without legacy completion', () => {
    const live = progressWith(allDoneExcept('browser'))
    expect(getSetupGuideBrowserMilestoneAwareProgress(live, false)).toBe(live)
  })
})

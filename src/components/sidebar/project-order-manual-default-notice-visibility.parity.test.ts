// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/project-order-manual-default-notice-visibility.test.ts
import { describe, expect, it } from 'vitest'
import {
  isExistingPersistedProfile,
  resolveProjectOrderManualDefaultNoticeDismissed
} from '../../shared/project-order-manual-default-notice'
import { shouldShowProjectOrderManualDefaultNotice } from './project-order-manual-default-notice-visibility'

describe('resolveProjectOrderManualDefaultNoticeDismissed', () => {
  it('keeps an explicit dismissal', () => {
    expect(
      resolveProjectOrderManualDefaultNoticeDismissed({
        rawDismissed: true,
        rawProjectOrderBy: undefined,
        isExistingProfile: true
      })
    ).toBe(true)
  })

  it('hides the notice for brand-new profiles', () => {
    expect(
      resolveProjectOrderManualDefaultNoticeDismissed({
        rawDismissed: undefined,
        rawProjectOrderBy: undefined,
        isExistingProfile: false
      })
    ).toBe(true)
  })

  it('hides the notice when recent ordering was already explicit', () => {
    expect(
      resolveProjectOrderManualDefaultNoticeDismissed({
        rawDismissed: undefined,
        rawProjectOrderBy: 'recent',
        isExistingProfile: true
      })
    ).toBe(true)
  })

  it('shows the notice for upgraded profiles without an explicit project order', () => {
    expect(
      resolveProjectOrderManualDefaultNoticeDismissed({
        rawDismissed: undefined,
        rawProjectOrderBy: undefined,
        isExistingProfile: true
      })
    ).toBe(false)
  })

  it('treats a false persisted dismissal as not dismissed', () => {
    expect(
      resolveProjectOrderManualDefaultNoticeDismissed({
        rawDismissed: false,
        rawProjectOrderBy: 'manual',
        isExistingProfile: true
      })
    ).toBe(false)
  })
})

describe('isExistingPersistedProfile', () => {
  it('accepts repos, a closed onboarding, or any persisted ui keys', () => {
    expect(
      isExistingPersistedProfile({ repoCount: 1, onboardingClosedAt: null, ui: {} })
    ).toBe(true)
    expect(isExistingPersistedProfile({ repoCount: 0, onboardingClosedAt: 10, ui: {} })).toBe(
      true
    )
    expect(
      isExistingPersistedProfile({ repoCount: 0, onboardingClosedAt: null, ui: { groupBy: 'repo' } })
    ).toBe(true)
  })

  it('rejects a genuinely empty profile', () => {
    expect(
      isExistingPersistedProfile({ repoCount: 0, onboardingClosedAt: null, ui: {} })
    ).toBe(false)
    expect(
      isExistingPersistedProfile({ repoCount: 0, onboardingClosedAt: undefined, ui: null })
    ).toBe(false)
  })
})

describe('shouldShowProjectOrderManualDefaultNotice', () => {
  const visible = {
    persistedUIReady: true,
    projectOrderManualDefaultNoticeDismissed: false,
    groupBy: 'repo' as const,
    projectOrderBy: 'manual' as const,
    repoCount: 2
  }

  it('shows only when project grouping is active and repos exist', () => {
    expect(shouldShowProjectOrderManualDefaultNotice(visible)).toBe(true)
    expect(shouldShowProjectOrderManualDefaultNotice({ ...visible, groupBy: 'none' })).toBe(false)
    expect(shouldShowProjectOrderManualDefaultNotice({ ...visible, repoCount: 0 })).toBe(false)
  })

  it('stays hidden until the persisted ui is ready or after an explicit dismissal', () => {
    expect(
      shouldShowProjectOrderManualDefaultNotice({ ...visible, persistedUIReady: false })
    ).toBe(false)
    expect(
      shouldShowProjectOrderManualDefaultNotice({
        ...visible,
        projectOrderManualDefaultNoticeDismissed: true
      })
    ).toBe(false)
  })

  it('only explains manual ordering', () => {
    expect(shouldShowProjectOrderManualDefaultNotice({ ...visible, projectOrderBy: 'recent' })).toBe(
      false
    )
  })
})

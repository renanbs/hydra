import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/store'
import { openWorkspaceCreationComposerWithTourHandoff } from './workspace-creation-tour-handoff'

type TourTestState = Record<string, unknown>

const TOUR_KEYS = [
  'activeContextualTourId',
  'activeContextualTourStepIndex',
  'activeContextualTourSource',
  'contextualToursSeenIds',
  'detachContextualTourSource',
  'completeContextualTour',
  'requestContextualTour',
] as const

function getTourState(): TourTestState {
  return useAppStore.getState() as unknown as TourTestState
}

function setTourState(patch: TourTestState): void {
  ;(useAppStore.setState as unknown as (next: TourTestState) => void)(patch)
}

const baseline: TourTestState = {}

beforeEach(() => {
  const state = getTourState()
  for (const key of TOUR_KEYS) {
    baseline[key] = state[key]
  }
})

afterEach(() => {
  setTourState(baseline)
  vi.useRealTimers()
})

describe('openWorkspaceCreationComposerWithTourHandoff (D01-012)', () => {
  it('opens the composer without touching the tour when no handoff applies', () => {
    const openComposer = vi.fn()
    const request = vi.fn()
    setTourState({
      activeContextualTourId: null,
      activeContextualTourStepIndex: 0,
      activeContextualTourSource: null,
      contextualToursSeenIds: [],
      requestContextualTour: request,
    })

    openWorkspaceCreationComposerWithTourHandoff(openComposer, { hasProjects: true })

    expect(openComposer).toHaveBeenCalledTimes(1)
    expect(request).not.toHaveBeenCalled()
  })

  it('retires the agent-sessions tour and requests the workspace-creation tour', async () => {
    vi.useFakeTimers()
    const openComposer = vi.fn()
    const detach = vi.fn()
    const complete = vi.fn(() => {
      setTourState({ activeContextualTourId: null, activeContextualTourSource: null })
    })
    const request = vi.fn(() => {
      setTourState({ activeContextualTourId: 'workspace-creation' })
    })
    setTourState({
      activeContextualTourId: 'workspace-agent-sessions',
      activeContextualTourStepIndex: 1,
      activeContextualTourSource: 'agent_sessions_modal',
      contextualToursSeenIds: [],
      detachContextualTourSource: detach,
      completeContextualTour: complete,
      requestContextualTour: request,
    })

    openWorkspaceCreationComposerWithTourHandoff(openComposer, { hasProjects: true })

    expect(openComposer).toHaveBeenCalledTimes(1)
    expect(detach).toHaveBeenCalledWith('workspace-agent-sessions', 'agent_sessions_modal')
    expect(complete).toHaveBeenCalledWith('workspace-agent-sessions')

    await vi.runAllTimersAsync()
    expect(request).toHaveBeenCalledWith('workspace-creation', 'workspace_creation_modal', false, {
      force: true,
    })
  })

  it('does not request a tour that was already seen', async () => {
    vi.useFakeTimers()
    const openComposer = vi.fn()
    const request = vi.fn()
    setTourState({
      activeContextualTourId: 'workspace-agent-sessions',
      activeContextualTourStepIndex: 1,
      activeContextualTourSource: 'agent_sessions_modal',
      contextualToursSeenIds: ['workspace-creation'],
      detachContextualTourSource: vi.fn(),
      completeContextualTour: vi.fn(),
      requestContextualTour: request,
    })

    openWorkspaceCreationComposerWithTourHandoff(openComposer, { hasProjects: true })
    await vi.runAllTimersAsync()

    expect(openComposer).toHaveBeenCalledTimes(1)
    expect(request).not.toHaveBeenCalled()
  })

  it('needs a project before handoff, mirroring Orca repos.length > 0', () => {
    const openComposer = vi.fn()
    const detach = vi.fn()
    const request = vi.fn()
    setTourState({
      activeContextualTourId: 'workspace-agent-sessions',
      activeContextualTourStepIndex: 1,
      activeContextualTourSource: 'agent_sessions_modal',
      contextualToursSeenIds: [],
      detachContextualTourSource: detach,
      completeContextualTour: vi.fn(),
      requestContextualTour: request,
    })

    openWorkspaceCreationComposerWithTourHandoff(openComposer, { hasProjects: false })

    expect(openComposer).toHaveBeenCalledTimes(1)
    expect(detach).not.toHaveBeenCalled()
    expect(request).not.toHaveBeenCalled()
  })
})

import type { ContextualTourId } from '../../shared/contextual-tours'
import { useAppStore } from '@/store'
import { requestContextualTourWhenReady } from './request-contextual-tour-when-ready'

export const WORKSPACE_CREATION_TOUR_SOURCE = 'workspace_creation_modal'

/**
 * The live store composes the UI slice (tour state lives there) but its
 * declared shape does not repeat the slice's members, so the handoff narrows
 * exactly the keys it drives.
 */
export type WorkspaceCreationTourHandoffState = {
  activeContextualTourId: ContextualTourId | null
  activeContextualTourStepIndex: number
  activeContextualTourSource: string | null
  contextualToursSeenIds: readonly string[]
  detachContextualTourSource: (id: ContextualTourId, source: string) => void
  completeContextualTour: (id?: ContextualTourId) => void
}

/**
 * Orca `openWorkspaceCreationComposerWithTourHandoff`: the New workspace
 * control is both the next step of the agent-sessions tour and the entry point
 * of the workspace-creation tour, so opening the composer has to retire one
 * tour before requesting the other.
 *
 * `hasProjects` mirrors Orca's `repos.length > 0` guard — without a project
 * the composer cannot complete, so the tour is not handed off.
 */
export function openWorkspaceCreationComposerWithTourHandoff(
  openComposer: () => void,
  options?: { hasProjects?: boolean }
): void {
  const state = useAppStore.getState() as unknown as WorkspaceCreationTourHandoffState
  const hasProjects = options?.hasProjects ?? false

  const shouldHandoffFromAgentSessionsTour =
    hasProjects &&
    state.activeContextualTourId === 'workspace-agent-sessions' &&
    state.activeContextualTourStepIndex === 1

  if (shouldHandoffFromAgentSessionsTour && state.activeContextualTourSource) {
    // Why synchronous detach: the composer mount can run a modal-cancellation
    // effect before the retry window opens, which would otherwise suppress the
    // request for the next tour.
    state.detachContextualTourSource('workspace-agent-sessions', state.activeContextualTourSource)
    state.completeContextualTour('workspace-agent-sessions')
  }

  openComposer()

  if (!shouldHandoffFromAgentSessionsTour) {
    return
  }
  if (state.contextualToursSeenIds.includes('workspace-creation')) {
    return
  }

  requestContextualTourWhenReady({
    id: 'workspace-creation',
    source: WORKSPACE_CREATION_TOUR_SOURCE,
    wasFeaturePreviouslyInteracted: false,
    waitForActiveTourToClear: true,
  })
}

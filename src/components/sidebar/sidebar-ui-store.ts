import type { HydraSettings } from '../../shared/settings-types'
import type { FeatureInteractionState } from '../../shared/feature-interactions'
import type { Repo } from '../../shared/repo-types'
import type { Worktree } from '../../shared/worktree/types'
import { useAppStore } from '../../store'

/**
 * Typed view of the store members the sidebar chrome consumes.
 *
 * `AppState` still declares the ported UI slice behind an index signature while
 * its contract module is an auto-stub, so these members arrive as `unknown`.
 * This adapter is the single place that names the shape; components must not
 * repeat the assertion.
 */
export type SidebarUiState = {
  activeView: string | null
  settings: HydraSettings | null
  repos: Repo[]
  activeRepoId: string | null
  worktreesByRepo: Record<string, Worktree[]>
  persistedUIReady: boolean
  activeModal: string
  modalData: Record<string, unknown>
  openModal: (modal: string, data?: Record<string, unknown>) => void
  closeModal: () => void
  featureInteractions: FeatureInteractionState
  setupGuideSidebarDismissed: boolean
  setSetupGuideSidebarDismissed: (dismissed: boolean) => void
  setupGuideBrowserMilestoneMigrated: boolean
  setupGuideBrowserMilestoneLegacyComplete: boolean
  markSetupGuideBrowserMilestoneMigrated: (legacyComplete: boolean) => void
  openTaskPage: (data?: Record<string, unknown>) => void
  openAutomationsPage: () => void
  openMobilePage: () => void
  openArtifactsPage: () => void
  openSkillsPage: () => void
  prefetchWorkItems: (
    repoId: string,
    repoPath: string,
    limit?: number,
    query?: string
  ) => void
}

function toSidebarUiState(state: unknown): SidebarUiState {
  // Why the cast: the slice composition guarantees these members at runtime;
  // only the auto-stubbed contract hides them from the compiler.
  const sidebarState = state as SidebarUiState
  return sidebarState
}

export function useSidebarUiStore<T>(selector: (state: SidebarUiState) => T): T {
  return useAppStore((state) => selector(toSidebarUiState(state)))
}

export function readSidebarUiState(): SidebarUiState {
  return toSidebarUiState(useAppStore.getState())
}

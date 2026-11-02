// Orca `revealWorkspaceFilters` reaches the painted sidebar through this request.
//
// Why an event and not a store write: the painted display options live in the
// sidebar shell (one writer, persisted through `ui.sidebar`), while activation
// runs deep in `lib/worktree-activation`. The activation path cannot reach that
// writer directly without a second copy of the state, so it publishes WHICH
// workspace must be revealed and the sidebar relaxes only the filters that hide
// it (`relaxFiltersForReveal`).
import type { RevealTargetTraits } from "./reveal-filter-relaxation";

export const SIDEBAR_REVEAL_FILTER_REQUEST_EVENT = "hydra:relax-sidebar-filters-for-reveal";

export function requestSidebarFilterRelaxation(target: RevealTargetTraits): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<RevealTargetTraits>(SIDEBAR_REVEAL_FILTER_REQUEST_EVENT, {
      detail: target,
    })
  );
}

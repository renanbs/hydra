// Ported from Orca (`renderer/src/components/sidebar/WorktreeCardStatusSlot.tsx`,
// new-card branch): the card's left lane, in strict precedence —
//   1. review glyph  (PR exists; merged renders purple)
//   2. branch glyph  (branch identity, no PR, quiet status)
//   3. status dot    (everything else: green active/done, grey inactive, spinner working)
// Orca only swaps the dot for a glyph while the status is quiet
// (`QUIET_REVIEW_REPLACEABLE_STATUSES = active | done | inactive`), so a working
// or needs-attention pane keeps the activity signal.
import React from "react";
import { GitBranch } from "lucide-react";
import { cn } from "../../lib/utils";
import type { WorktreeStatus } from "../../lib/worktree-status";
import { WorktreeStatusIndicator } from "./WorktreeStatusIndicator";
import { ReviewIcon, reviewStatusLabel, type PrDisplay } from "./pr-display";

/** Orca `QUIET_REVIEW_REPLACEABLE_STATUSES`. */
const QUIET_STATUSES: Partial<Record<WorktreeStatus, true>> = {
  active: true,
  done: true,
  inactive: true,
};

export interface WorktreeCardStatusLaneProps {
  status: WorktreeStatus;
  branch?: string;
  prDisplay?: PrDisplay | null;
  className?: string;
}

export function WorktreeCardStatusLane({
  status,
  branch = "",
  prDisplay = null,
  className = "",
}: WorktreeCardStatusLaneProps): React.JSX.Element {
  const quiet = Boolean(QUIET_STATUSES[status]);
  const hasBranchIdentity = branch.length > 0;
  const showReview = quiet && prDisplay !== null;
  const showBranch = quiet && !showReview && hasBranchIdentity;

  if (showReview && prDisplay) {
    return (
      <span
        data-worktree-status-lane="review"
        className={cn("inline-flex size-5 shrink-0 items-center justify-center p-0.5", className)}
        aria-label={reviewStatusLabel(prDisplay)}
        title={reviewStatusLabel(prDisplay)}
      >
        <ReviewIcon review={prDisplay} className="size-[13px] translate-x-px" />
      </span>
    );
  }

  if (showBranch) {
    return (
      <span
        data-worktree-status-lane="branch"
        className={cn("inline-flex size-5 shrink-0 items-center justify-center p-0.5", className)}
        aria-label="Branch"
        title="Branch"
      >
        <GitBranch className="size-[13px] translate-x-px text-muted-foreground/70" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      data-worktree-status-lane="status"
      className={cn("inline-flex size-5 shrink-0 items-center justify-center", className)}
    >
      <WorktreeStatusIndicator status={status} />
    </span>
  );
}

export default WorktreeCardStatusLane;

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
  /** Unknown/unread state painted over the glyph in the new card style. */
  isUnread?: boolean;
  /** New style: whether the lane belongs to the newer card (overlay vs bell). */
  newCardStyle?: boolean;
  className?: string;
}

const UNREAD_ALERT_CLASS =
  "pointer-events-none absolute left-0 top-1/2 size-[6px] -translate-y-1/2 rounded-full bg-amber-500 ring-2 ring-worktree-sidebar";

function withUnreadOverlay(node: React.JSX.Element): React.JSX.Element {
  return (
    <span
      data-worktree-status-lane-unread=""
      className="relative inline-flex size-5 shrink-0 items-center justify-center"
    >
      {node}
      <span
        data-worktree-unread-alert=""
        className={UNREAD_ALERT_CLASS}
        aria-hidden="true"
      />
    </span>
  );
}

export function WorktreeCardStatusLane({
  status,
  branch = "",
  prDisplay = null,
  isUnread = false,
  newCardStyle = false,
  className = "",
}: WorktreeCardStatusLaneProps): React.JSX.Element {
  const quiet = Boolean(QUIET_STATUSES[status]);
  const hasBranchIdentity = branch.length > 0;
  const showReview = quiet && prDisplay !== null;
  const showBranch = quiet && !showReview && hasBranchIdentity;
  const showUnreadOverlay =
    newCardStyle && isUnread && status !== "working" && status !== "permission";
  const withUnread = (node: React.JSX.Element): React.JSX.Element =>
    showUnreadOverlay ? withUnreadOverlay(node) : node;
  if (showReview && prDisplay) {
    return withUnread(
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
    return withUnread(
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

  const statusNode = (
    <span
      data-worktree-status-lane="status"
      className={cn("inline-flex size-5 shrink-0 items-center justify-center", className)}
    >
      <WorktreeStatusIndicator status={status} />
    </span>
  );
  // Orca suppresses the overlay while working/permission already own the lane; the
  // unread state still reaches assistive tech through the card's aria labels.
  return withUnread(statusNode);
}

export default WorktreeCardStatusLane;

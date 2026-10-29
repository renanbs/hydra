// Ported from Orca (`renderer/src/components/sidebar/worktree-review-helpers.tsx`):
// the review glyph and its tone ladder. The purple tone is the one that tells the
// user a PR MERGED — Orca paints it on the card's status lane (`WorktreeCardStatusSlot`).
import React from "react";
import { CircleCheck, CircleDashed, CircleDot, GitMerge, GitPullRequest } from "lucide-react";
import { cn } from "../../lib/utils";

export type ReviewState = "open" | "merged" | "closed" | "draft";
export type ReviewChecks = "success" | "failure" | "pending";

export interface PrDisplay {
  number?: number | null;
  state: ReviewState;
  status?: ReviewChecks | null;
  provider?: "github" | "gitlab" | string | null;
}

/** Orca `getCheckTone`: live check status outranks the review state's own tone. */
function getCheckTone(review: PrDisplay): string | null {
  if (review.state !== "open") return null;
  if (review.status === "failure") return "text-rose-500/85";
  if (review.status === "pending") return "text-amber-500/85";
  if (review.status === "success") return "text-emerald-500/80";
  return null;
}

/** Orca `getStateTone`: merged is purple, open is emerald, closed/draft go muted. */
export function getReviewStateTone(state: ReviewState): string {
  if (state === "merged") return "text-purple-600/70 dark:text-purple-400/70";
  if (state === "open") return "text-emerald-500/80";
  if (state === "closed") return "text-muted-foreground/60";
  if (state === "draft") return "text-muted-foreground/50";
  return "text-muted-foreground opacity-70";
}

/** Orca `getReviewLabel`: GitLab reviews are merge requests. */
export function getReviewLabel(review: PrDisplay): "MR" | "PR" {
  return review.provider === "gitlab" ? "MR" : "PR";
}

/** Orca `getProviderName`: used by tooltips to name the hosting provider. */
export function getProviderName(review: PrDisplay): string {
  switch (review.provider) {
    case "gitlab":
      return "GitLab";
    case "bitbucket":
      return "Bitbucket";
    case "azure-devops":
      return "Azure DevOps";
    case "gitea":
      return "Gitea";
    default:
      return "GitHub";
  }
}

function getReviewStateIcon(state: ReviewState) {
  switch (state) {
    case "merged":
      return GitMerge;
    case "closed":
      return CircleDot;
    case "draft":
      return CircleDashed;
    default:
      // An open review has no state-specific glyph; the provider decides it.
      return null;
  }
}

export function reviewLabel(review: PrDisplay): string {
  return `${getReviewLabel(review)} #${review.number ?? ""}`.trim();
}

export function reviewStatusLabel(review: PrDisplay): string {
  const label = reviewLabel(review);
  if (review.state === "merged") return `${label}: Merged`;
  if (review.state === "closed") return `${label}: Closed`;
  if (review.state === "draft") return `${label}: Draft`;
  if (review.status === "failure") return `${label} checks: Failed`;
  if (review.status === "pending") return `${label} checks: Pending`;
  if (review.status === "success") return `${label} checks: Passing`;
  return `${label}: Open`;
}

export function ReviewIcon({
  review,
  className,
}: {
  review: PrDisplay;
  className?: string;
}): React.JSX.Element {
  // Orca `ReviewIcon`: the state glyph wins; an open review falls back to the
  // provider glyph (GitLab merge requests use GitMerge).
  const StateIcon = getReviewStateIcon(review.state);
  const Icon =
    StateIcon ?? (review.provider === "gitlab" ? GitMerge : GitPullRequest);
  // A satisfied check keeps emerald; the icon still reads as a review.
  const tone = getCheckTone(review) ?? getReviewStateTone(review.state);
  return <Icon className={cn(className, tone)} aria-hidden="true" />;
}

export { CircleCheck as ReviewCheckIcon };

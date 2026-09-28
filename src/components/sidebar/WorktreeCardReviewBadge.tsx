// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from "react";
import { GitPullRequest, GitMerge } from "lucide-react";
import type { WorktreeReviewStatus } from "./types";

export interface WorktreeCardReviewBadgeProps {
  review: WorktreeReviewStatus;
  onClick?: (e: React.MouseEvent) => void;
}

export function WorktreeCardReviewBadge({
  review,
  onClick,
}: WorktreeCardReviewBadgeProps): React.JSX.Element | null {
  if (!review.pr_number && !review.state) {
    return null;
  }

  const isMerged = review.state === "merged";
  const isOpen = review.state === "open";
  const hasChecksFailed = review.has_failing_checks === true;

  let colorClasses = "text-neutral-400 border-neutral-700 bg-neutral-800/80";
  if (hasChecksFailed) {
    colorClasses = "text-rose-300 border-rose-500/40 bg-rose-500/15";
  } else if (isMerged) {
    colorClasses = "text-purple-300 border-purple-500/40 bg-purple-500/15";
  } else if (isOpen) {
    colorClasses = "text-emerald-300 border-emerald-500/40 bg-emerald-500/15";
  }

  const tooltip = `PR #${review.pr_number ?? ""}${
    review.title ? `: ${review.title}` : ""
  }${review.state ? ` (${review.state})` : ""}`;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (review.url) {
          window.open(review.url, "_blank");
        }
        onClick?.(e);
      }}
      className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[9px] font-mono font-medium transition cursor-pointer leading-tight ${colorClasses}`}
      title={tooltip}
      aria-label={tooltip}
    >
      {isMerged ? (
        <GitMerge className="w-2.5 h-2.5 shrink-0" />
      ) : (
        <GitPullRequest className="w-2.5 h-2.5 shrink-0" />
      )}
      {review.pr_number ? <span>#{review.pr_number}</span> : <span>PR</span>}
    </button>
  );
}

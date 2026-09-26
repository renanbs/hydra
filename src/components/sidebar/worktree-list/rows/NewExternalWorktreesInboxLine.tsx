// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from "react";
import { ChevronRight, X } from "lucide-react";

export interface NewExternalWorktreesInboxLineProps {
  repoDisplayName: string;
  inboxCount: number;
  pending?: boolean;
  error?: string | null;
  onReview?: () => void;
  onSuppress?: () => void;
  className?: string;
}

export function NewExternalWorktreesInboxLine({
  repoDisplayName,
  inboxCount,
  pending = false,
  error = null,
  onReview,
  onSuppress,
  className = "",
}: NewExternalWorktreesInboxLineProps): React.JSX.Element | null {
  if (inboxCount <= 0) return null;

  const isSingular = inboxCount === 1;
  const countLabel = isSingular ? "hidden worktree" : "hidden worktrees";
  const reviewAriaLabel = `Review ${inboxCount} ${countLabel} in ${repoDisplayName}`;
  const suppressAriaLabel = `Hide external worktrees permanently for ${repoDisplayName}`;

  return (
    <section
      aria-busy={pending}
      className={`mx-1 my-0.5 ml-3 text-worktree-sidebar-foreground ${className}`}
    >
      <div className="group relative">
        <button
          type="button"
          disabled={pending || !onReview}
          aria-label={reviewAriaLabel}
          onClick={onReview}
          className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-md border border-worktree-sidebar-border px-2 py-1.5 text-[11px] leading-none text-muted-foreground transition-colors hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
        >
          <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full border border-border px-1.5 text-[10px] font-medium leading-none tabular-nums text-foreground">
            {inboxCount}
          </span>
          <span className="min-w-0 flex-1 truncate text-left text-neutral-300">
            {countLabel}
          </span>
          <ChevronRight
            aria-hidden="true"
            className={`w-3 h-3 shrink-0 text-neutral-400 ${
              onSuppress ? "group-hover:opacity-0" : ""
            }`}
          />
        </button>

        {onSuppress && (
          <button
            type="button"
            disabled={pending}
            aria-label={suppressAriaLabel}
            title="Don't show again"
            onClick={(e) => {
              e.stopPropagation();
              onSuppress();
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-sm text-neutral-400 hover:bg-worktree-sidebar-accent hover:text-neutral-200 opacity-0 group-hover:opacity-100 transition cursor-pointer"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        )}
      </div>

      {error && (
        <p className="px-1.5 pb-1 pt-0.5 text-[11px] leading-4 text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

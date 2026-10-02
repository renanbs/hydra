// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/NewExternalWorktreesInboxLine.tsx`: ring-2 focus,
// `size-3` chevron, `right-1` ghost suppress button behind a Tooltip, hover/focus handoff.
import React from "react";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
          className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-md border border-worktree-sidebar-border px-2 py-1.5 text-[11px] leading-none text-muted-foreground transition-colors hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-worktree-sidebar-ring disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
        >
          <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full border border-border px-1.5 text-[10px] font-medium leading-none tabular-nums">
            {inboxCount}
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{countLabel}</span>
          <ChevronRight
            aria-hidden="true"
            className={`size-3 shrink-0 ${
              onSuppress
                ? "can-hover:group-hover:opacity-0 can-hover:group-focus-within:opacity-0 [@media(hover:none)]:opacity-0"
                : ""
            }`}
          />
        </button>

        {onSuppress && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={pending}
                aria-label={suppressAriaLabel}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  onSuppress();
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-accent-foreground can-hover:pointer-events-none can-hover:opacity-0 can-hover:group-hover:pointer-events-auto can-hover:group-hover:opacity-100 can-hover:group-focus-within:pointer-events-auto can-hover:group-focus-within:opacity-100"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              Don&apos;t show again
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {error && (
        <p className="px-1.5 pb-1 pt-0.5 text-[11px] leading-4 text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/NewExternalWorktreesInboxLine.tsx` — the compact
// discovered-worktree pill: `(N) hidden worktree(s)` + count badge + `›` chevron, with a
// suppressing `×` hovering over the chevron slot. Clicking the row (not the `×`) opens the
// `Non-Orca worktrees` visibility dialog.
//
// Gate: this is the *second*, continuous phase of Orca's two-phase inbox. It only renders
// once the repo's initial prompt completed (`externalWorktreeVisibilityPromptDismissedAt`
// is a number) and the repo did not opt out (`suppressed`). Before that the expandable
// notice (`ImportedWorktreesVisibilityLine`) owns the surface.
import React from "react";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ExecutionHostId } from "@/shared/execution-host";
import NoticeHostGlyph from "../../NoticeHostGlyph";
import type { GitWorktreeInfo } from "../../types";
import { selectInboxWorktrees } from "./ImportedWorktreesVisibilityLine";

export interface NewExternalWorktreesInboxLineProps {
  repoDisplayName: string;
  /** Host this checkout lives on. Set only when the project is checked out on more
   *  than one host, where the count alone cannot identify the row. */
  hostContextLabel?: string;
  hostContextHostId?: ExecutionHostId;
  /** Raw `scan_worktrees.hidden` for this repo; the line owns gate + baseline filtering. */
  hiddenWorktrees: readonly GitWorktreeInfo[];
  /** Paths the user already acknowledged with `Keep hidden`; never offered again
   *  (Orca `externalWorktreeInboxBaselinePaths`). */
  baselinePaths?: readonly string[];
  /** The `×` opt-out (`externalWorktreeDiscoverySuppressedAt`). */
  suppressed?: boolean;
  /** Epoch ms the initial prompt completed (Orca
   *  `externalWorktreeVisibilityPromptDismissedAt`). The pill is the continuous phase, so
   *  it only appears once this is a number. */
  promptDismissedAt?: number | null;
  pending?: boolean;
  error?: string | null;
  /** Opens the `Non-Orca worktrees` visibility dialog. */
  onReview?: () => void;
  onSuppress?: () => void;
  className?: string;
}

export function NewExternalWorktreesInboxLine({
  repoDisplayName,
  hostContextLabel,
  hostContextHostId,
  hiddenWorktrees,
  baselinePaths,
  suppressed = false,
  promptDismissedAt = null,
  pending = false,
  error = null,
  onReview,
  onSuppress,
  className = "",
}: NewExternalWorktreesInboxLineProps): React.JSX.Element | null {
  const inboxCount = selectInboxWorktrees(hiddenWorktrees, baselinePaths).length;
  if (suppressed || promptDismissedAt == null || inboxCount === 0) {
    return null;
  }

  const isSingular = inboxCount === 1;
  const countLabel = isSingular ? "hidden worktree" : "hidden worktrees";
  // Why: the same project on two hosts renders two identical rows, so every accessible
  // name has to name the host as well as the project (Orca `repoScopeLabel`).
  const repoScopeLabel = hostContextLabel
    ? `${repoDisplayName} on ${hostContextLabel}`
    : repoDisplayName;
  const suppressAriaLabel = `Hide external worktrees permanently for ${repoScopeLabel}`;
  const reviewAriaLabel = `Review ${inboxCount} ${countLabel} in ${repoScopeLabel}`;

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
          {hostContextLabel ? (
            <span className="inline-flex min-w-0 shrink items-center gap-1">
              {hostContextHostId ? (
                <NoticeHostGlyph
                  hostId={hostContextHostId}
                  hostLabel={hostContextLabel}
                  keyboardFocusable={false}
                />
              ) : null}
              <span className="min-w-0 truncate text-[10px] leading-none text-muted-foreground">
                {hostContextLabel}
              </span>
            </span>
          ) : null}
          <ChevronRight
            aria-hidden="true"
            className={`size-3 shrink-0 ${
              onSuppress
                ? "can-hover:group-hover:opacity-0 can-hover:group-focus-within:opacity-0 [@media(hover:none)]:opacity-0"
                : ""
            }`}
          />
        </button>
        {onSuppress ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={pending}
                aria-label={suppressAriaLabel}
                onClick={onSuppress}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-accent-foreground can-hover:pointer-events-none can-hover:opacity-0 can-hover:group-hover:pointer-events-auto can-hover:group-hover:opacity-100 can-hover:group-focus-within:pointer-events-auto can-hover:group-focus-within:opacity-100 cursor-pointer"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              Don&apos;t show again
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {error ? (
        <p className="px-1.5 pb-1 pt-0.5 text-[11px] leading-4 text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

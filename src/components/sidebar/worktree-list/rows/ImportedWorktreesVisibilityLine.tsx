// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/ImportedWorktreesVisibilityLine.tsx` — the
// expandable discovered-worktree inbox: collapsible header (`Hiding N discovered
// worktrees` + keep-hidden `×`), a body grouped by parent path with a per-group count
// and one bullet per worktree (previewed at `PREVIEW_LIMIT`, groups capped at
// `GROUP_LIMIT`), and the `Change this later from the project menu.` footer offering
// `Keep hidden` / `Show in worktree list`.
//
// Gate: this is the *first* phase of Orca's two-phase inbox. It renders every hidden
// discovered worktree until the repo's initial visibility prompt completes
// (`externalWorktreeVisibilityPromptDismissedAt`), minus the baseline paths the user
// already acknowledged; after that the compact pill (`NewExternalWorktreesInboxLine`)
// takes over. Both surfaces own their half of the phase gate so exactly one shows.
import React, { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  normalizeRuntimePathForComparison,
  normalizeRuntimePathSeparators,
} from "@/shared/cross-platform-path";
import type { GitWorktreeInfo } from "../../types";

export const UNKNOWN_EXTERNAL_WORKTREE_PARENT_PATH = "Unknown location";

export interface ImportedWorktreesVisibilityLineProps {
  repoDisplayName: string;
  /** Raw `scan_worktrees.hidden` for this repo; the line owns gate + baseline filtering. */
  hiddenWorktrees: readonly GitWorktreeInfo[];
  /** Paths the user already acknowledged with `Keep hidden`; never offered again
   *  (Orca `externalWorktreeInboxBaselinePaths`). */
  baselinePaths?: readonly string[];
  /** The `×` opt-out (`externalWorktreeDiscoverySuppressedAt`): closes the line
   *  permanently for the repo, so it must not come back on its own. */
  suppressed?: boolean;
  /** Epoch ms the initial prompt completed (Orca
   *  `externalWorktreeVisibilityPromptDismissedAt`). The notice is the first phase, so
   *  it hides as soon as this is a number. */
  promptDismissedAt?: number | null;
  pending?: boolean;
  error?: string | null;
  /** Per-path recovery: one `import_worktree` per hidden worktree. */
  onShow?: (worktreePath: string) => void;
  /** Acknowledge the listed paths into the repo's inbox baseline. */
  onKeepHidden?: (worktreePaths: string[]) => void;
  className?: string;
}

export interface ExternalWorktreePathGroup {
  path: string;
  worktrees: GitWorktreeInfo[];
}

// Orca parity constants (`ImportedWorktreesVisibilityLine.tsx`).
const PREVIEW_LIMIT = 3;
const GROUP_LIMIT = 5;
const KEEP_HIDDEN_LABEL = "Keep hidden - recover from the project menu";

/** Orca `getExternalWorktreeParentPath` (external-worktree-visibility.ts:19). */
export function getExternalWorktreeParentPath(worktreePath: string | undefined): string {
  if (!worktreePath) return UNKNOWN_EXTERNAL_WORKTREE_PARENT_PATH;
  const separated = normalizeRuntimePathSeparators(worktreePath);
  const normalized =
    separated === "/" || /^[A-Za-z]:\/$/.test(separated)
      ? separated
      : separated.replace(/\/+$/, "");
  if (!normalized) return UNKNOWN_EXTERNAL_WORKTREE_PARENT_PATH;
  if (normalized.startsWith("//")) {
    const parts = normalized.slice(2).split("/").filter(Boolean);
    if (parts.length < 2) return UNKNOWN_EXTERNAL_WORKTREE_PARENT_PATH;
    if (parts.length === 2) return `//${parts[0]}/${parts[1]}`;
    return `//${parts.slice(0, -1).join("/")}`;
  }
  const lastSeparatorIndex = normalized.lastIndexOf("/");
  if (lastSeparatorIndex === -1) return UNKNOWN_EXTERNAL_WORKTREE_PARENT_PATH;
  if (lastSeparatorIndex === 0) return "/";
  if (/^[A-Za-z]:\/$/.test(normalized)) return normalized;
  if (/^[A-Za-z]:\/[^/]+$/.test(normalized)) return `${normalized.slice(0, 2)}/`;
  return normalized.slice(0, lastSeparatorIndex);
}

/** Orca `groupWorktreesByParentPath`, insertion-ordered so the list stays stable. */
export function groupWorktreesByParentPath(
  worktrees: readonly GitWorktreeInfo[]
): ExternalWorktreePathGroup[] {
  const groups: ExternalWorktreePathGroup[] = [];
  const groupByPath = new Map<string, ExternalWorktreePathGroup>();
  for (const worktree of worktrees) {
    const path = getExternalWorktreeParentPath(worktree.path);
    const existing = groupByPath.get(path);
    if (existing) {
      existing.worktrees.push(worktree);
      continue;
    }
    const group = { path, worktrees: [worktree] };
    groupByPath.set(path, group);
    groups.push(group);
  }
  return groups;
}

/** Orca `getNewExternalWorktreeInboxWorktrees` baseline subtraction. */
export function selectInboxWorktrees(
  hiddenWorktrees: readonly GitWorktreeInfo[],
  baselinePaths?: readonly string[]
): GitWorktreeInfo[] {
  if (!baselinePaths || baselinePaths.length === 0) return [...hiddenWorktrees];
  const baseline = new Set(baselinePaths.map(normalizeRuntimePathForComparison));
  return hiddenWorktrees.filter(
    (worktree) => !baseline.has(normalizeRuntimePathForComparison(worktree.path))
  );
}

/** Orca `mergeExternalWorktreeInboxPaths`: normalize-compare, keep the caller's spelling. */
export function mergeExternalWorktreeInboxPaths(
  existing: readonly string[] | undefined,
  additions: readonly string[]
): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const path of [...(existing ?? []), ...additions]) {
    const normalized = normalizeRuntimePathForComparison(path);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(path);
  }
  return merged;
}

export function ImportedWorktreesVisibilityLine({
  repoDisplayName,
  hiddenWorktrees,
  baselinePaths,
  suppressed = false,
  promptDismissedAt = null,
  pending = false,
  error = null,
  onShow,
  onKeepHidden,
  className = "",
}: ImportedWorktreesVisibilityLineProps): React.JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedGroupPathKeys, setExpandedGroupPathKeys] = useState<Set<string>>(new Set());

  const inboxWorktrees = selectInboxWorktrees(hiddenWorktrees, baselinePaths);
  const inboxCount = inboxWorktrees.length;
  // First phase only: once the prompt was dismissed, the compact pill is the surface.
  if (suppressed || promptDismissedAt != null || inboxCount === 0) {
    return null;
  }

  const isSingular = inboxCount === 1;
  const countLabel = isSingular ? "discovered worktree" : "discovered worktrees";
  const expandAriaLabel = `${isExpanded ? "Collapse" : "Expand"} ${inboxCount} hidden worktrees for ${repoDisplayName}`;
  const keepHiddenAriaLabel = `Keep ${inboxCount} ${countLabel} hidden for ${repoDisplayName}; recover from the project menu`;
  const inboxPaths = inboxWorktrees.map((worktree) => worktree.path);
  const worktreeGroups = groupWorktreesByParentPath(inboxWorktrees);
  const visibleWorktreeGroups = worktreeGroups.slice(0, GROUP_LIMIT);
  const remainingGroupCount = Math.max(0, worktreeGroups.length - visibleWorktreeGroups.length);

  const toggleGroupExpanded = (path: string): void => {
    const key = normalizeRuntimePathForComparison(path);
    setExpandedGroupPathKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <section
      aria-busy={pending}
      className={`mx-1 my-0.5 ml-3 text-worktree-sidebar-foreground ${className}`}
    >
      <div className="flex min-h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-[11px] leading-none text-muted-foreground transition-colors hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-accent-foreground">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={pending}
          aria-expanded={isExpanded}
          aria-label={expandAriaLabel}
          onClick={() => setIsExpanded((value) => !value)}
          className="shrink-0 rounded-[4px] text-muted-foreground hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-accent-foreground cursor-pointer"
        >
          <ChevronRight
            className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
        </Button>
        <span className="min-w-0 flex-1 truncate text-left">
          Hiding {inboxCount} {countLabel}
        </span>
        {onKeepHidden && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={pending}
                aria-label={keepHiddenAriaLabel}
                onClick={() => onKeepHidden(inboxPaths)}
                className="shrink-0 rounded-md text-muted-foreground hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-accent-foreground cursor-pointer"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              {KEEP_HIDDEN_LABEL}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {isExpanded && (
        <div
          className="ml-4 mt-0.5 grid gap-1 border-l border-worktree-sidebar-border pb-1 pl-2"
          aria-label="Hidden worktree groups"
        >
          {visibleWorktreeGroups.map((group) => (
            <div key={group.path} className="grid min-w-0 gap-0.5 rounded-md px-1.5 py-1">
              <div className="flex min-h-7 min-w-0 items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      className="block min-w-0 flex-1 truncate font-mono text-[10px] leading-4 text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring"
                    >
                      {group.path}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={4}>
                    {group.path}
                  </TooltipContent>
                </Tooltip>
                <span className="shrink-0 rounded-full border border-worktree-sidebar-border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                  {group.worktrees.length}
                </span>
              </div>
              <ul
                className="list-disc space-y-0.5 py-0 pl-5 pr-2 text-xs text-muted-foreground marker:text-muted-foreground"
                aria-label={`${group.path} preview`}
              >
                {group.worktrees
                  .slice(
                    0,
                    expandedGroupPathKeys.has(normalizeRuntimePathForComparison(group.path))
                      ? group.worktrees.length
                      : PREVIEW_LIMIT
                  )
                  .map((worktree, index) => (
                    <li
                      key={worktree.id ?? worktree.path ?? `${group.path}-${index}`}
                      className="min-h-6 min-w-0 py-0.5 pl-0"
                    >
                      <span className="block min-w-0 truncate font-medium">
                        {worktree.branch?.trim() ||
                          worktree.displayName ||
                          worktree.display_name ||
                          worktree.path}
                      </span>
                    </li>
                  ))}
                {group.worktrees.length > PREVIEW_LIMIT && (
                  <li className="list-none">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={pending}
                      onClick={() => toggleGroupExpanded(group.path)}
                      className="h-6 justify-start px-0 text-[11px] font-normal text-muted-foreground hover:text-worktree-sidebar-accent-foreground cursor-pointer"
                    >
                      {expandedGroupPathKeys.has(normalizeRuntimePathForComparison(group.path))
                        ? "Show fewer"
                        : `Show ${group.worktrees.length - PREVIEW_LIMIT} more`}
                    </Button>
                  </li>
                )}
              </ul>
            </div>
          ))}
          {remainingGroupCount > 0 && (
            <div className="py-1 pl-7 pr-2 text-[11px] leading-4 text-muted-foreground">
              + {remainingGroupCount} more locations
            </div>
          )}
          <div className="grid gap-1 px-1.5 pb-1 pt-1">
            <p className="rounded-md bg-worktree-sidebar-accent px-2 py-1 text-[10px] font-medium leading-4 text-worktree-sidebar-accent-foreground">
              Change this later from the project menu.
            </p>
            <div className="flex min-w-0 items-center gap-1.5">
              {onKeepHidden && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={pending}
                  onClick={() => onKeepHidden(inboxPaths)}
                  className="h-6 px-2 text-[11px] font-medium cursor-pointer"
                >
                  Keep hidden
                </Button>
              )}
              {onShow && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={pending}
                  onClick={() => inboxPaths.forEach((worktreePath) => onShow(worktreePath))}
                  className="h-6 px-2 text-[11px] font-medium cursor-pointer"
                >
                  Show in worktree list
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="px-1.5 pb-1 pt-0.5 text-[11px] leading-4 text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

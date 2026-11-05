// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/rows/RepoScanUnavailableIndicator.tsx
//
// Marks a repo whose worktree scan failed, so its rows are retained but cannot be
// trusted. Click re-runs the scan; the failure is otherwise re-tried only by the next
// incidental refresh.
//
// Adapted to Hydra: the failure payload is a prop (`detected`) instead of a store read,
// because Hydra's painted sidebar receives detection results from the host-routed scan.
// `fixCommand` is rendered only when the failure payload actually carries one — never
// derived here — so the Copy command never copies a command the host did not name.
import React from "react";
import { TriangleAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { translate } from "@/i18n/i18n";
import type { Repo } from "../../shared/repo-types";
import type { DetectedWorktreeListResult } from "../../shared/worktree/types";
import {
  classifyWorktreeScanFailure,
  type WorktreeScanFailureKind,
} from "../../shared/worktree-scan-failure";

const FAILURE_MESSAGE_KEYS: Partial<Record<WorktreeScanFailureKind, [string, string]>> = {
  "xcode-license": [
    "auto.components.sidebar.RepoScanUnavailableIndicator.xcodeLicense",
    "Apple developer tools require license acceptance before Git can run.",
  ],
  "developer-tools": [
    "auto.components.sidebar.RepoScanUnavailableIndicator.developerTools",
    "Apple command-line developer tools are missing or unavailable.",
  ],
  "architecture-mismatch": [
    "auto.components.sidebar.RepoScanUnavailableIndicator.architectureMismatch",
    "A Git-related executable could not run because its CPU architecture is incompatible with this execution host. Install Git and related tools for the host architecture.",
  ],
};

export type RepoScanUnavailableTarget = Pick<Repo, "id" | "displayName" | "path"> &
  Partial<Pick<Repo, "executionHostId" | "connectionId">>;

export type RepoScanDetectedState = Pick<
  DetectedWorktreeListResult,
  "authoritative" | "unavailableReason" | "failureKind"
>;

export interface RepoScanUnavailableIndicatorProps {
  repo: RepoScanUnavailableTarget;
  /** Latest detection result for the repo; older hosts may omit the failure kind. */
  detected: RepoScanDetectedState | null | undefined;
  retryScan: () => void | Promise<void>;
  /** Concrete command carried by the failure payload, when it has one. */
  fixCommand?: string;
  /** Clipboard seam; defaults to the webview clipboard. */
  copyText?: (value: string) => Promise<void>;
}

function defaultCopyText(value: string): Promise<void> {
  return navigator.clipboard.writeText(value);
}

export function RepoScanUnavailableIndicator({
  repo,
  detected,
  retryScan,
  fixCommand,
  copyText = defaultCopyText,
}: RepoScanUnavailableIndicatorProps): React.JSX.Element | null {
  const [pending, setPending] = React.useState(false);

  if (!detected || detected.authoritative || !detected.unavailableReason) {
    return null;
  }

  const failureKind = detected.failureKind ?? classifyWorktreeScanFailure(detected.unavailableReason);
  const failureMessageKey = FAILURE_MESSAGE_KEYS[failureKind];
  const failureMessage = failureMessageKey
    ? translate(failureMessageKey[0], failureMessageKey[1])
    : detected.unavailableReason;
  const title = translate(
    "auto.components.sidebar.RepoScanUnavailableIndicator.title",
    "Worktree scan failed for {{value0}}",
    { value0: repo.displayName }
  );
  const retryLabel = translate(
    "auto.components.sidebar.RepoScanUnavailableIndicator.retry",
    "Retry scan"
  );
  const diagnosticText = [
    `Repository: ${repo.displayName}`,
    `Path: ${repo.path}`,
    ...(repo.executionHostId ? [`Execution host: ${repo.executionHostId}`] : []),
    `Failure: ${detected.unavailableReason}`,
  ].join("\n");

  return (
    <TooltipProvider delayDuration={400} disableHoverableContent={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            data-repo-header-action=""
            className={cn(
              "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] text-destructive",
              pending && "opacity-60"
            )}
            aria-label={`${title}. ${retryLabel}`}
            aria-busy={pending}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setPending(true);
              void Promise.resolve(retryScan()).finally(() => setPending(false));
            }}
          >
            <TriangleAlert className="size-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={6}
          className="pointer-events-auto max-w-72"
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <div className="space-y-1">
            <div className="font-medium">{title}</div>
            <div className="break-words text-muted-foreground">{failureMessage}</div>
            {fixCommand ? (
              <div className="break-words font-mono text-xs text-muted-foreground">
                {fixCommand}
              </div>
            ) : null}
            <div className="text-muted-foreground">
              {translate(
                "auto.components.sidebar.RepoScanUnavailableIndicator.retained",
                "Existing worktrees are kept until a scan succeeds. Click to retry."
              )}
            </div>
            <div className="flex items-center justify-start gap-3 border-t border-border/60 pt-1">
              {fixCommand ? (
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => void copyText(fixCommand)}
                >
                  {translate(
                    "auto.components.sidebar.RepoScanUnavailableIndicator.copyCommand",
                    "Copy command"
                  )}
                </button>
              ) : null}
              <button
                type="button"
                className="text-xs underline"
                onClick={() => void copyText(diagnosticText)}
              >
                {translate(
                  "auto.components.sidebar.RepoScanUnavailableIndicator.copyDiagnostics",
                  "Copy diagnostics"
                )}
              </button>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default RepoScanUnavailableIndicator;

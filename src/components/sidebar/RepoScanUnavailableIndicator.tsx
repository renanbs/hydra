// Orca `RepoScanUnavailableIndicator`: a failed worktree scan is a first-class row,
// not a silent fallback. It offers a retry and copies the diagnostic so the user can
// hand it to support without reproducing the failure.
//
// Failure taxonomy (D03a-075): newer hosts reject the scan with a JSON payload
// (`{ failureKind, message, fixCommand }`) encoded in the command's string error;
// older hosts send the raw error. The indicator normalizes both, classifies the
// raw text when no kind was sent, and offers "Copy command" only when the payload
// actually named one — never derived from the failure kind.
import React from "react";
import { AlertTriangle, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { translate } from "@/i18n/i18n";
import {
  classifyWorktreeScanFailure,
  isWorktreeScanFailureKind,
  type WorktreeScanFailureKind,
} from "../../shared/worktree-scan-failure";

export interface RepoScanFailure {
  repoPath: string;
  /** Raw host error, or the JSON failure payload encoded as a string. */
  message: string;
  /** Structured cause, when the caller already decoded the payload. */
  failureKind?: WorktreeScanFailureKind;
  /** Concrete fix command carried by the payload, when it has one. */
  fixCommand?: string;
}

type NormalizedScanFailure = {
  repoPath: string;
  message: string;
  failureKind?: WorktreeScanFailureKind;
  fixCommand?: string;
};

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

/** Decode the host's structured rejection while keeping older raw errors working. */
function normalizeFailure(failure: RepoScanFailure): NormalizedScanFailure {
  if (failure.message.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(failure.message);
      if (parsed !== null && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        return {
          repoPath: failure.repoPath,
          message: typeof record.message === "string" ? record.message : failure.message,
          failureKind: failure.failureKind ?? (isWorktreeScanFailureKind(record.failureKind) ? record.failureKind : undefined),
          fixCommand:
            failure.fixCommand ?? (typeof record.fixCommand === "string" ? record.fixCommand : undefined),
        };
      }
    } catch {
      // Not JSON: older hosts send the raw error string.
    }
  }
  return failure;
}

function failureKindOf(failure: NormalizedScanFailure): WorktreeScanFailureKind {
  return failure.failureKind ?? classifyWorktreeScanFailure(failure.message);
}

function failureExplanation(failure: NormalizedScanFailure): string {
  const messageKey = FAILURE_MESSAGE_KEYS[failureKindOf(failure)];
  return messageKey ? translate(messageKey[0], messageKey[1]) : failure.message;
}

export function RepoScanUnavailableIndicator({
  failures,
  onRetry,
}: {
  failures: readonly RepoScanFailure[];
  onRetry: () => void;
}): React.JSX.Element | null {
  if (failures.length === 0) return null;
  const normalized = failures.map(normalizeFailure);
  const diagnostics = normalized
    .map((failure) => `${failure.repoPath}\n${failure.message}`)
    .join("\n\n");
  const fixCommands = normalized.flatMap((failure) => (failure.fixCommand ? [failure.fixCommand] : []));
  const copy = (value: string): void => {
    void navigator.clipboard?.writeText(value).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Could not copy to clipboard")
    );
  };
  return (
    <div
      role="status"
      data-repo-scan-unavailable
      className="mx-2 mt-1 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive"
    >
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="mt-px inline-flex shrink-0" aria-label="Worktree scan failure details">
              <AlertTriangle className="size-3.5" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="max-w-72">
            <div className="space-y-2">
              {normalized.map((failure) => (
                <div key={failure.repoPath} className="space-y-1">
                  <div className="font-medium">{failure.repoPath}</div>
                  <div className="text-muted-foreground">{failureExplanation(failure)}</div>
                  {failure.fixCommand ? (
                    <div className="break-words font-mono text-xs text-muted-foreground">
                      {failure.fixCommand}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {failures.length === 1
            ? "Worktree scan unavailable"
            : `Worktree scan unavailable for ${failures.length} repositories`}
        </div>
        <div className="truncate text-muted-foreground" title={diagnostics}>
          {failures.map((failure) => failure.repoPath).join(", ")}
        </div>
        <div className="truncate text-muted-foreground">
          {translate(
            "auto.components.sidebar.RepoScanUnavailableIndicator.retained",
            "Existing worktrees are kept until a scan succeeds. Click to retry."
          )}
        </div>
      </div>
      {fixCommands.length > 0 ? (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => copy(fixCommands.join("\n"))}
          title={translate(
            "auto.components.sidebar.RepoScanUnavailableIndicator.copyCommand",
            "Copy command"
          )}
        >
          <Copy className="size-3" />
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="xs"
        onClick={() => copy(diagnostics)}
        title={translate(
          "auto.components.sidebar.RepoScanUnavailableIndicator.copyDiagnostics",
          "Copy diagnostics"
        )}
      >
        <Copy className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        onClick={onRetry}
        title={translate(
          "auto.components.sidebar.RepoScanUnavailableIndicator.retry",
          "Retry scan"
        )}
      >
        <RefreshCw className="size-3" />
      </Button>
    </div>
  );
}

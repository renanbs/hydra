// Orca `RepoScanUnavailableIndicator`: a failed worktree scan is a first-class row,
// not a silent fallback. It offers a retry and copies the diagnostic so the user can
// hand it to support without reproducing the failure.
import React from "react";
import { AlertTriangle, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface RepoScanFailure {
  repoPath: string;
  message: string;
}

export function RepoScanUnavailableIndicator({
  failures,
  onRetry,
}: {
  failures: readonly RepoScanFailure[];
  onRetry: () => void;
}): React.JSX.Element | null {
  if (failures.length === 0) return null;
  const diagnostics = failures
    .map((failure) => `${failure.repoPath}\n${failure.message}`)
    .join("\n\n");
  return (
    <div
      role="status"
      data-repo-scan-unavailable
      className="mx-2 mt-1 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive"
    >
      <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {failures.length === 1
            ? "Worktree scan unavailable"
            : `Worktree scan unavailable for ${failures.length} repositories`}
        </div>
        <div className="truncate text-muted-foreground" title={diagnostics}>
          {failures.map((failure) => failure.repoPath).join(", ")}
        </div>
      </div>
      <Button
        variant="ghost"
        size="xs"
        onClick={() => {
          void navigator.clipboard?.writeText(diagnostics).then(
            () => toast.success("Diagnostics copied"),
            () => toast.error("Could not copy diagnostics")
          );
        }}
        title="Copy diagnostics"
      >
        <Copy className="size-3" />
      </Button>
      <Button variant="ghost" size="xs" onClick={onRetry} title="Retry scan">
        <RefreshCw className="size-3" />
      </Button>
    </div>
  );
}

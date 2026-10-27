// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: worktree-list/rows/pending-creation-row.tsx
//
// The optimistic row a create request owns until the backend answers. It is inert:
// the workspace does not exist yet, so there is nothing to activate or rename.
import { LoaderCircle } from "lucide-react";

export function PendingWorktreeCreationRow({
  branchName,
  agentName,
  repoName,
}: {
  branchName?: string;
  agentName?: string;
  repoName?: string;
}): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-1 my-0.5 ml-3 flex min-h-8 min-w-0 items-center gap-2 rounded-md border border-worktree-sidebar-border px-2 py-1.5 text-[11px] leading-none text-muted-foreground"
    >
      <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">
        Creating {branchName || "workspace"}…
      </span>
      {agentName ? (
        <span className="shrink-0 text-[10px] text-muted-foreground/80">{agentName}</span>
      ) : null}
      {repoName ? (
        <span className="max-w-[7rem] shrink-0 truncate text-[10px] text-muted-foreground/60">
          {repoName}
        </span>
      ) : null}
    </div>
  );
}

// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/PendingWorktreeRow.tsx
//
// The inline sidebar row a background create owns (D03b-021/D03b-022). It is
// self-contained: it reads its own pending entry by `creationId`, so the row pipeline
// only has to say where in the list the optimistic row belongs.
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { useAppStore } from "@/store";
import { getCreationProgressLabel } from "@/lib/pending-worktree-creation";

function getStatusLabel(status: string | undefined, error: string | null | undefined): string {
  if (status === "error") {
    return error || "Creation failed";
  }
  return "Creating workspace…";
}

export function PendingWorktreeCreationRow({
  creationId,
  repoName,
}: {
  /** Stable id of the in-flight create the optimistic row belongs to (Orca `PendingWorktreeRow`). */
  creationId: string;
  repoName?: string;
}): React.JSX.Element | null {
  const entry = useAppStore((state) => state.pendingWorktreeCreations?.[creationId]);
  const isActive = useAppStore((state) => state.activePendingCreationId === creationId);
  if (!entry) {
    return null;
  }

  const isError = entry.status === "error";
  const name = entry.request.displayName || entry.request.name || "workspace";
  const label = isError
    ? getStatusLabel(entry.status, entry.error)
    : getCreationProgressLabel(entry);

  return (
    <div
      role="status"
      aria-live="polite"
      data-pending-worktree-creation-id={creationId}
      data-pending-worktree-creation-status={entry.status}
      className={[
        "group mx-1 my-0.5 flex min-h-8 min-w-0 items-center gap-1 rounded-md border px-1 text-[11px] leading-none transition-colors",
        isActive
          ? "border-worktree-sidebar-ring/35 bg-worktree-sidebar-accent/70 ring-1 ring-worktree-sidebar-ring/30"
          : "border-worktree-sidebar-border hover:bg-worktree-sidebar-accent/60"
      ].join(" ")}
    >
      <button
        type="button"
        // Why never setActiveWorktree: the workspace does not exist yet. The pending id
        // drives the content surface instead, exactly like Orca's faux tab strip.
        onClick={() => {
          const store = useAppStore.getState();
          store.setActivePendingWorktreeCreation(creationId);
          store.updatePendingWorktreeCreation(creationId, { loaderVisible: true });
        }}
        className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-left"
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          {isError ? (
            <AlertTriangle
              className="size-3.5 text-destructive"
              aria-label="Worktree creation failed"
            />
          ) : (
            <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium text-worktree-sidebar-foreground">
            {name}
          </span>
          <span
            className={[
              "block truncate text-[10px]",
              isError ? "text-destructive/90" : "text-muted-foreground"
            ].join(" ")}
          >
            {label}
          </span>
        </span>
        {repoName ? (
          <span className="max-w-[7rem] shrink-0 truncate text-[10px] text-muted-foreground/60">
            {repoName}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        title="Cancel"
        aria-label="Cancel worktree creation"
        onClick={() => useAppStore.getState().removePendingWorktreeCreation(creationId)}
        className={[
          "mr-0.5 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-opacity hover:bg-worktree-sidebar-accent hover:text-foreground focus-visible:opacity-100",
          isError ? "opacity-100" : "can-hover:opacity-0 group-hover:opacity-100"
        ].join(" ")}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

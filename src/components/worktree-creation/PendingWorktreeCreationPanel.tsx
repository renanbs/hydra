// Content surface for a background workspace create (D03b-021/D03b-022).
//
// Orca swaps the content area for a create panel while `activePendingCreationId` is set;
// Hydra has no faux tab strip, so this panel owns the same job: it names the workspace,
// mirrors the sidebar row's progress/error line, and offers the same Cancel (which goes
// through the one `removePendingWorktreeCreation` writer) plus a way back to the tabs.
import { AlertTriangle, ArrowLeft, LoaderCircle, X } from "lucide-react";
import { useAppStore } from "@/store";
import { getCreationProgressLabel } from "@/lib/pending-worktree-creation";

export function PendingWorktreeCreationPanel(): React.JSX.Element | null {
  const creationId = useAppStore((state) => state.activePendingCreationId);
  const entry = useAppStore((state) =>
    creationId ? state.pendingWorktreeCreations?.[creationId] : undefined
  );
  if (!creationId || !entry) {
    return null;
  }

  const isError = entry.status === "error";
  const name = entry.request.displayName || entry.request.name || "workspace";
  const label = isError
    ? entry.error || "Creation failed"
    : getCreationProgressLabel(entry);

  return (
    <div
      data-pending-worktree-creation-panel=""
      role="status"
      aria-live="polite"
      className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <button
        type="button"
        onClick={() => useAppStore.getState().setActivePendingWorktreeCreation(null)}
        className="absolute left-4 top-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to workspaces
      </button>

      <span className="flex size-10 items-center justify-center rounded-full border border-border bg-card">
        {isError ? (
          <AlertTriangle className="size-5 text-destructive" aria-hidden />
        ) : (
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-hidden />
        )}
      </span>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-foreground">{name}</div>
        <div className={isError ? "text-xs text-destructive/90" : "text-xs text-muted-foreground"}>
          {label}
        </div>
      </div>
      <button
        type="button"
        onClick={() => useAppStore.getState().removePendingWorktreeCreation(creationId)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition hover:bg-accent"
      >
        <X className="size-3.5" />
        Cancel creation
      </button>
    </div>
  );
}

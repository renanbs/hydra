// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/DeleteWorktreeLineageNotice.tsx
// Parity with Orca `components/sidebar/DeleteWorktreeLineageNotice.tsx`: the
// confirmation names every descendant it will destroy, with the first four rows
// expanded (name, path, dirty count) and a "+N more" tail.
import { Workflow } from "lucide-react";
import type { WorkspaceDeleteLineageRow } from "./sidebar/workspace-delete-lineage";

const PREVIEW_LIMIT = 4;

export function DeleteWorktreeLineageNotice({
  descendants,
  dirtyChangeCountsByWorktreeId,
}: {
  descendants: readonly WorkspaceDeleteLineageRow[];
  dirtyChangeCountsByWorktreeId: Record<string, number | null>;
}): React.JSX.Element | null {
  if (descendants.length === 0) {
    return null;
  }
  const hiddenCount = Math.max(0, descendants.length - PREVIEW_LIMIT);

  return (
    <div className="mt-3 min-w-0 max-w-full overflow-hidden rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px]">
      <div className="flex items-start gap-2">
        <Workflow className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-amber-300">Child workspaces will be deleted</p>
          <p className="mt-0.5 text-neutral-400">
            Deleting this workspace also deletes {descendants.length} child workspace
            {descendants.length === 1 ? "" : "s"}.
          </p>
          <div className="mt-2 min-w-0 max-w-full space-y-1 overflow-hidden rounded border border-neutral-800 bg-neutral-950/60 px-2 py-1.5">
            {descendants.slice(0, PREVIEW_LIMIT).map((child) => {
              const dirty = dirtyChangeCountsByWorktreeId[child.path] ?? null;
              return (
                <div key={`${child.hostId ?? ""}\0${child.id}`} className="min-w-0 overflow-hidden">
                  <div className="truncate text-neutral-200">{child.displayName || child.path}</div>
                  <div className="truncate font-mono text-[10px] text-neutral-500">{child.path}</div>
                  {dirty != null && dirty > 0 && (
                    <span className="mt-0.5 inline-block rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
                      {dirty} uncommitted
                    </span>
                  )}
                </div>
              );
            })}
            {hiddenCount > 0 && <div className="text-neutral-500">+{hiddenCount} more</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/WorktreeSidebarDropIndicator.tsx

/** The insertion line a drag opens between two rows, drawn in list-content coordinates. */
export function WorktreeSidebarDropIndicator({ y }: { y: number }): React.JSX.Element {
  return (
    <div
      role="presentation"
      data-worktree-sidebar-drop-indicator="true"
      className="pointer-events-none absolute left-3 right-2 z-30 flex h-3 -translate-y-1/2 items-center"
      style={{ top: `${y}px` }}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-worktree-sidebar-ring shadow-[0_0_0_2px_var(--worktree-sidebar)]" />
      <span className="h-0.5 flex-1 rounded-full bg-worktree-sidebar-ring shadow-[0_0_0_2px_var(--worktree-sidebar)]" />
      <span className="size-1.5 shrink-0 rounded-full bg-worktree-sidebar-ring shadow-[0_0_0_2px_var(--worktree-sidebar)]" />
    </div>
  )
}

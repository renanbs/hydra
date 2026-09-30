// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// resource-usage-open-slices: Derives the list of open PTY sessions grouped by worktree.
import { useAppStore } from '../../store'

export function useOpenResourceUsageSlices(): Record<string, string[]> {
  const tabsByWorktree = useAppStore((s) => s.tabsByWorktree)
  return Object.fromEntries(
    Object.entries(tabsByWorktree).map(([worktreePath, tabs]) => [
      worktreePath,
      tabs.filter((t) => t.sessionId).map((t) => t.sessionId as string)
    ])
  )
}

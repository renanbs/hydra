// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: lib/worktree-tab-bucket-projection.ts
//
// D11-006: the sidebar's visibility pipeline reads tab identity, never tab metadata.
// Renaming a tab, changing its URL or its favicon must not invalidate the pipeline's
// inputs, so each worktree's bucket keeps the previous array reference when only
// metadata changed. Buckets are isolated by worktree id: a change in one bucket never
// recomputes its siblings.
export type WorktreeTabBucketProjection<T, P> = {
  project: (source: Readonly<Record<string, readonly T[]>>) => Record<string, P[]>
}

export function createWorktreeTabBucketProjection<T, P>(args: {
  projectTab: (tab: T) => P
  /** True when the projected tab still names the same tab as the source tab. */
  isSameProjectedTab: (previous: P, next: T) => boolean
  /** Test seam: called once per bucket whose source array changed identity. */
  onInspectBucket?: (worktreeId: string) => void
}): WorktreeTabBucketProjection<T, P> {
  let previousSource: Readonly<Record<string, readonly T[]>> | null = null
  let previousProjection: Record<string, P[]> | null = null
  const projectionBySourceBucket = new WeakMap<readonly T[], P[]>()

  return {
    project(source) {
      if (source === previousSource && previousProjection) {
        return previousProjection
      }

      const sourceKeys = Object.keys(source)
      let changed =
        previousProjection === null || sourceKeys.length !== Object.keys(previousProjection).length
      const nextProjection: Record<string, P[]> = {}

      for (const worktreeId of sourceKeys) {
        const sourceTabs = source[worktreeId] ?? []
        const previousTabs = previousProjection?.[worktreeId]
        let projectedTabs: P[]

        if (previousSource?.[worktreeId] === sourceTabs && previousTabs) {
          projectedTabs = previousTabs
        } else {
          args.onInspectBucket?.(worktreeId)
          const cached = projectionBySourceBucket.get(sourceTabs)
          if (cached) {
            projectedTabs = cached
          } else if (
            previousTabs &&
            previousTabs.length === sourceTabs.length &&
            sourceTabs.every((tab, index) => {
              const previousTab = previousTabs[index]
              return previousTab !== undefined && args.isSameProjectedTab(previousTab, tab)
            })
          ) {
            projectedTabs = previousTabs
          } else {
            projectedTabs = sourceTabs.map(args.projectTab)
          }
          projectionBySourceBucket.set(sourceTabs, projectedTabs)
        }

        nextProjection[worktreeId] = projectedTabs
        if (projectedTabs !== previousTabs) {
          changed = true
        }
      }

      previousSource = source
      if (!changed && previousProjection) {
        return previousProjection
      }
      previousProjection = nextProjection
      return nextProjection
    }
  }
}

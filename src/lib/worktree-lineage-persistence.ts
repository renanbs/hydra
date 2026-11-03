// D07-023: the sidebar hierarchy is durable state, not a renderer preference.
// These helpers keep the hydrate/migrate/diff rules out of React so the pure
// cases are testable without mounting App.

export const LEGACY_WORKTREE_LINEAGE_KEY = 'hydra:worktree_lineage'

export type WorktreeLineageMap = Record<string, string>

export type WorktreeLineageChange = {
  childPath: string
  /** `null` clears the edge. */
  parentPath: string | null
}

export type WorktreeLineageHydrationPlan = {
  /** Authoritative map the sidebar should render. */
  lineage: WorktreeLineageMap
  /** Legacy edges to write through when the DB is still empty. */
  migrate: WorktreeLineageChange[]
  /**
   * The legacy key can be retired. True when the DB already answered (stale
   * copy) or migration succeeded; the caller removes it only after writes land.
   */
  clearLegacy: boolean
}

/** Tolerant parse for both the IPC payload and the legacy localStorage blob. */
export function normalizeWorktreeLineage(value: unknown): WorktreeLineageMap {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  const lineage: WorktreeLineageMap = {}
  for (const [child, parent] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof child === 'string' &&
      child.trim().length > 0 &&
      typeof parent === 'string' &&
      parent.trim().length > 0
    ) {
      lineage[child] = parent
    }
  }
  return lineage
}

export function parseLegacyWorktreeLineage(raw: string | null): WorktreeLineageMap {
  if (!raw) return {}
  try {
    return normalizeWorktreeLineage(JSON.parse(raw))
  } catch {
    return {}
  }
}

/**
 * Empty DB + legacy entries = one-time migration. A non-empty DB is
 * authoritative and any leftover legacy blob is stale.
 */
export function planWorktreeLineageHydration(
  stored: unknown,
  legacy: unknown
): WorktreeLineageHydrationPlan {
  const storedLineage = normalizeWorktreeLineage(stored)
  const legacyLineage = normalizeWorktreeLineage(legacy)
  const hasStored = Object.keys(storedLineage).length > 0
  const hasLegacy = Object.keys(legacyLineage).length > 0

  if (!hasStored && hasLegacy) {
    return {
      lineage: legacyLineage,
      migrate: Object.entries(legacyLineage).map(([childPath, parentPath]) => ({
        childPath,
        parentPath
      })),
      clearLegacy: true
    }
  }
  return {
    lineage: storedLineage,
    migrate: [],
    clearLegacy: hasLegacy
  }
}

/** Minimal write set between two maps, so one edit never rewrites the world. */
export function worktreeLineageChanges(
  previous: WorktreeLineageMap,
  next: WorktreeLineageMap
): WorktreeLineageChange[] {
  const changes: WorktreeLineageChange[] = []
  const children = new Set([...Object.keys(previous), ...Object.keys(next)])
  for (const childPath of children) {
    const before = previous[childPath]
    const after = next[childPath]
    if (before === after) continue
    changes.push({ childPath, parentPath: after ?? null })
  }
  return changes
}

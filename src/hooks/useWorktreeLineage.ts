// D07-023: React owner for the persisted worktree hierarchy.
//
// State is optimistic so drag/picker/unnest feel instant; the IPC write is the
// truth. A rejected write rolls back only the edges that did not land and
// reports one toast, so a failed persist never leaves a tree that the next boot
// silently contradicts.
import { invoke } from '@tauri-apps/api/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  LEGACY_WORKTREE_LINEAGE_KEY,
  normalizeWorktreeLineage,
  parseLegacyWorktreeLineage,
  planWorktreeLineageHydration,
  worktreeLineageChanges,
  type WorktreeLineageMap
} from '../lib/worktree-lineage-persistence'

export type WorktreeLineageHydrationStatus = 'pending' | 'ready' | 'failed'

type WorktreeLineageStorage = Pick<Storage, 'getItem' | 'removeItem'>

export type UseWorktreeLineageOptions = {
  /** Test seams. Production uses localStorage and the sonner toast surface. */
  storage?: WorktreeLineageStorage
  notifyError?: (message: string) => void
}

export type WorktreeLineageController = {
  worktreeLineage: WorktreeLineageMap
  hydrationStatus: WorktreeLineageHydrationStatus
  /** Sets the same parent on every listed child. */
  setParents: (childPaths: readonly string[], parentPath: string) => Promise<void>
  /** Clears one edge (no-op when it does not exist). */
  clearParent: (childPath: string) => Promise<void>
  /** Clears every listed edge in one state update. */
  clearParents: (childPaths: readonly string[]) => Promise<void>
}

function defaultStorage(): WorktreeLineageStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function useWorktreeLineage(
  options: UseWorktreeLineageOptions = {}
): WorktreeLineageController {
  const [worktreeLineage, setWorktreeLineage] = useState<WorktreeLineageMap>({})
  const [hydrationStatus, setHydrationStatus] =
    useState<WorktreeLineageHydrationStatus>('pending')
  const lineageRef = useRef<WorktreeLineageMap>(worktreeLineage)
  lineageRef.current = worktreeLineage

  const storageRef = useRef<WorktreeLineageStorage | null>(
    options.storage ?? defaultStorage()
  )
  const notifyErrorRef = useRef<(message: string) => void>(
    options.notifyError ?? ((message: string) => toast.error(message))
  )
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve())
  /** Children the user changed before hydration answered; hydration must not undo them. */
  const touchedChildrenRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    const hydrate = async (): Promise<void> => {
      const storage = storageRef.current
      let stored: unknown = {}
      try {
        stored = await invoke<unknown>('get_worktree_lineage')
      } catch (error) {
        console.error('Failed to load worktree lineage:', error)
        if (!cancelled) setHydrationStatus('failed')
        return
      }

      const legacy = storage
        ? parseLegacyWorktreeLineage(storage.getItem(LEGACY_WORKTREE_LINEAGE_KEY))
        : {}
      const plan = planWorktreeLineageHydration(stored, legacy)

      if (plan.migrate.length > 0) {
        const applied: typeof plan.migrate = []
        try {
          for (const change of plan.migrate) {
            await invoke('set_worktree_lineage', {
              childPath: change.childPath,
              parentPath: change.parentPath
            })
            applied.push(change)
          }
          storage?.removeItem(LEGACY_WORKTREE_LINEAGE_KEY)
        } catch (error) {
          // Undo the edges that landed: leaving a partial DB while the legacy
          // blob stays would make the next boot treat the DB as authoritative
          // and silently drop the rest of the migration.
          await Promise.allSettled(
            applied.map((change) =>
              invoke('set_worktree_lineage', {
                childPath: change.childPath,
                parentPath: null
              })
            )
          )
          // Keep the legacy blob for the next boot, but render it now so the
          // hierarchy is not lost just because the one-time write failed.
          console.error('Failed to migrate worktree lineage:', error)
          if (!cancelled) {
            lineageRef.current = plan.lineage
            setWorktreeLineage(plan.lineage)
            setHydrationStatus('ready')
          }
          return
        }
      } else if (plan.clearLegacy) {
        storage?.removeItem(LEGACY_WORKTREE_LINEAGE_KEY)
      }

      if (cancelled) return
      const merged = normalizeWorktreeLineage(plan.lineage)
      for (const childPath of touchedChildrenRef.current) {
        const currentParent = lineageRef.current[childPath]
        if (currentParent === undefined) {
          delete merged[childPath]
        } else {
          merged[childPath] = currentParent
        }
      }
      lineageRef.current = merged
      setWorktreeLineage(merged)
      setHydrationStatus('ready')
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback((next: WorktreeLineageMap): Promise<void> => {
    const previous = lineageRef.current
    const changes = worktreeLineageChanges(previous, next)
    if (changes.length === 0) return Promise.resolve()

    for (const change of changes) {
      touchedChildrenRef.current.add(change.childPath)
    }
    lineageRef.current = next
    setWorktreeLineage(next)

    const operation = writeQueueRef.current.then(async () => {
      const persisted: typeof changes = []
      try {
        for (const change of changes) {
          await invoke('set_worktree_lineage', {
            childPath: change.childPath,
            parentPath: change.parentPath
          })
          persisted.push(change)
        }
      } catch (error) {
        const unpersisted = changes.slice(persisted.length)
        const current = lineageRef.current
        const rollback: WorktreeLineageMap = { ...current }
        for (const change of unpersisted) {
          const attemptedParent = change.parentPath ?? undefined
          // A newer optimistic edit to this child wins over this rollback.
          if (current[change.childPath] !== attemptedParent) continue
          const previousParent = previous[change.childPath]
          if (previousParent === undefined) {
            delete rollback[change.childPath]
          } else {
            rollback[change.childPath] = previousParent
          }
        }
        lineageRef.current = rollback
        setWorktreeLineage(rollback)
        notifyErrorRef.current('Failed to save the workspace hierarchy')
        throw error
      }
    })
    writeQueueRef.current = operation.catch(() => {})
    return operation
  }, [])

  const setParents = useCallback(
    async (childPaths: readonly string[], parentPath: string): Promise<void> => {
      const normalizedParent = parentPath.trim()
      if (!normalizedParent) return
      const next = { ...lineageRef.current }
      let changed = false
      for (const childPath of childPaths) {
        const normalizedChild = childPath.trim()
        if (!normalizedChild || normalizedChild === normalizedParent) continue
        if (next[normalizedChild] === normalizedParent) continue
        next[normalizedChild] = normalizedParent
        changed = true
      }
      if (changed) await persist(next)
    },
    [persist]
  )

  const clearParents = useCallback(
    async (childPaths: readonly string[]): Promise<void> => {
      const next = { ...lineageRef.current }
      let changed = false
      for (const childPath of childPaths) {
        if (next[childPath] === undefined) continue
        delete next[childPath]
        changed = true
      }
      if (changed) await persist(next)
    },
    [persist]
  )

  const clearParent = useCallback(
    async (childPath: string): Promise<void> => {
      await clearParents([childPath])
    },
    [clearParents]
  )

  return { worktreeLineage, hydrationStatus, setParents, clearParent, clearParents }
}

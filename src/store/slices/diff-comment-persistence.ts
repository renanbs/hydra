// Hydra port of Orca's diff-note persistence: notes live per workspace key in the
// session SQLite (`worktree_diff_comments`). Writes are serialized per key so an
// older snapshot can never overwrite a newer one, and a failed write rolls the
// in-memory list back to what actually reached disk.
import type { StateCreator } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import type { DiffComment } from '../../shared/diff-comment-types'
import type { AppState } from '../types'

export type DiffCommentMutation = {
  previous: DiffComment[] | undefined
  next: DiffComment[]
}

export function normalizeDiffComment(comment: DiffComment): DiffComment {
  const rawSource = (comment as { source?: unknown }).source
  const source = rawSource === 'markdown' || rawSource === 'diff' ? rawSource : undefined
  const rawStartLine = (comment as { startLine?: unknown }).startLine
  const startLine =
    Number.isInteger(rawStartLine) &&
    typeof rawStartLine === 'number' &&
    rawStartLine >= 1 &&
    rawStartLine <= comment.lineNumber
      ? rawStartLine
      : undefined
  const rawSelectedText = (comment as { selectedText?: unknown }).selectedText
  const selectedText =
    typeof rawSelectedText === 'string' && rawSelectedText.trim().length > 0
      ? rawSelectedText.trim()
      : undefined
  const rawSentAt = (comment as { sentAt?: unknown }).sentAt
  const sentAt =
    typeof rawSentAt === 'number' && Number.isFinite(rawSentAt) && rawSentAt > 0
      ? rawSentAt
      : undefined

  return {
    ...comment,
    ...(source !== undefined ? { source } : {}),
    ...(source === undefined ? { source: undefined } : {}),
    ...(selectedText !== undefined ? { selectedText } : {}),
    ...(selectedText === undefined ? { selectedText: undefined } : {}),
    ...(startLine !== undefined ? { startLine } : {}),
    ...(startLine === undefined ? { startLine: undefined } : {}),
    ...(sentAt !== undefined ? { sentAt } : {}),
    ...(sentAt === undefined ? { sentAt: undefined } : {})
  }
}

const persistQueueByKey = new Map<string, Promise<void>>()
const lastPersistedByKey = new Map<string, DiffComment[] | undefined>()
const lastMutationNextByKey = new Map<string, DiffComment[]>()

function saveDiffComments(worktreeKey: string, comments: readonly DiffComment[]): Promise<void> {
  return invoke('save_diff_comments', {
    worktreeKey,
    comments: comments.map(normalizeDiffComment),
  })
}

export function enqueueDiffCommentPersist(
  set: Parameters<StateCreator<AppState>>[0],
  worktreeKey: string,
  get: () => AppState,
  mutation: DiffCommentMutation
): Promise<void> {
  const prior = persistQueueByKey.get(worktreeKey) ?? Promise.resolve()
  const chainBroken = lastMutationNextByKey.get(worktreeKey) !== mutation.previous
  if (!persistQueueByKey.has(worktreeKey) || chainBroken) {
    lastPersistedByKey.set(worktreeKey, mutation.previous)
  }
  lastMutationNextByKey.set(worktreeKey, mutation.next)

  const run = async (): Promise<void> => {
    let stateList: DiffComment[] | undefined
    try {
      stateList = get().diffCommentsByWorktree[worktreeKey]
      await saveDiffComments(worktreeKey, stateList ?? [])
    } catch (error) {
      // Converge to what actually landed; the identity guard makes this a no-op
      // when a later mutation already owns the array.
      const floor = lastPersistedByKey.has(worktreeKey)
        ? lastPersistedByKey.get(worktreeKey)
        : mutation.previous
      set((s: AppState) => {
        if (s.diffCommentsByWorktree[worktreeKey] !== mutation.next) return s
        return {
          diffCommentsByWorktree: {
            ...s.diffCommentsByWorktree,
            [worktreeKey]: floor ?? [],
          },
        }
      })
      throw error
    }
    lastPersistedByKey.set(worktreeKey, stateList)
  }

  const next = prior.then(run, run)
  persistQueueByKey.set(worktreeKey, next)
  const cleanup = (): void => {
    if (persistQueueByKey.get(worktreeKey) === next) {
      persistQueueByKey.delete(worktreeKey)
      lastPersistedByKey.delete(worktreeKey)
      lastMutationNextByKey.delete(worktreeKey)
    }
  }
  next.then(cleanup, cleanup)
  return next
}

/** Derive the next list inside the `set` updater so concurrent writes can't clobber each other. */
export function mutateDiffComments(
  set: Parameters<StateCreator<AppState>>[0],
  worktreeKey: string,
  mutate: (existing: DiffComment[]) => DiffComment[] | null
): DiffCommentMutation | null {
  let previous: DiffComment[] | undefined
  let next: DiffComment[] | null = null
  set((s: AppState) => {
    previous = s.diffCommentsByWorktree[worktreeKey]
    const computed = mutate(previous ?? [])
    if (computed === null) {
      return s
    }
    next = computed
    return {
      diffCommentsByWorktree: {
        ...s.diffCommentsByWorktree,
        [worktreeKey]: computed,
      },
    }
  })
  if (next === null) {
    return null
  }
  return { previous, next }
}

const loadInFlightByKey = new Map<string, Promise<void>>()

/** Hydrate one workspace's notes on first read; later reads are served from state. */
export function ensureDiffCommentsLoaded(
  set: Parameters<StateCreator<AppState>>[0],
  get: () => AppState,
  worktreeKey: string
): void {
  if (get().diffCommentsLoadedKeys[worktreeKey]) return
  const inflight = loadInFlightByKey.get(worktreeKey)
  if (inflight) return
  const load = invoke<DiffComment[]>('load_diff_comments', { worktreeKey })
    .then((comments) => {
      set((s: AppState) => {
        if (s.diffCommentsLoadedKeys[worktreeKey]) return s
        return {
          // A mutation that landed while the load was in flight owns the list.
          diffCommentsByWorktree: s.diffCommentsByWorktree[worktreeKey]
            ? s.diffCommentsByWorktree
            : {
                ...s.diffCommentsByWorktree,
                [worktreeKey]: comments.map(normalizeDiffComment),
              },
          diffCommentsLoadedKeys: { ...s.diffCommentsLoadedKeys, [worktreeKey]: true },
        }
      })
    })
    .catch((error) => {
      console.error('Failed to load diff comments:', error)
    })
    .finally(() => {
      loadInFlightByKey.delete(worktreeKey)
    })
  loadInFlightByKey.set(worktreeKey, load)
}

import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type { DiffComment } from '../../shared/diff-comment-types'
import { createBrowserUuid } from '@/lib/browser-uuid'
import {
  ensureDiffCommentsLoaded,
  enqueueDiffCommentPersist,
  mutateDiffComments,
  normalizeDiffComment
} from './diff-comment-persistence'

export type DiffCommentsSlice = {
  /** Notes keyed by workspace key (`worktree:<id>` / `folder:<id>`). */
  diffCommentsByWorktree: Record<string, DiffComment[]>
  /** Workspaces whose notes were hydrated from SQLite. */
  diffCommentsLoadedKeys: Record<string, boolean>
  getDiffComments: (worktreeId: string | null | undefined) => DiffComment[]
  addDiffComment: (input: Omit<DiffComment, 'id' | 'createdAt'>) => Promise<DiffComment | null>
  updateDiffComment: (worktreeId: string, commentId: string, body: string) => Promise<boolean>
  clearDeliveredDiffComments: (
    worktreeId: string,
    comments: readonly DiffCommentDeliverySnapshot[]
  ) => Promise<boolean>
  markDiffCommentsSent: (
    worktreeId: string,
    commentIds: readonly string[],
    sentAt?: number
  ) => Promise<boolean>
  deleteDiffComment: (worktreeId: string, commentId: string) => Promise<void>
  clearDiffComments: (worktreeId: string) => Promise<boolean>
  clearDiffCommentsForFile: (worktreeId: string, filePath: string) => Promise<boolean>
}

export type DiffCommentDeliverySnapshot = Pick<
  DiffComment,
  'body' | 'filePath' | 'id' | 'lineNumber' | 'selectedText' | 'source' | 'startLine'
>

function generateId(): string {
  return createBrowserUuid()
}

function deliverySnapshotMatches(
  comment: DiffComment,
  snapshot: DiffCommentDeliverySnapshot
): boolean {
  return (
    comment.id === snapshot.id &&
    comment.body === snapshot.body &&
    comment.filePath === snapshot.filePath &&
    comment.lineNumber === snapshot.lineNumber &&
    comment.startLine === snapshot.startLine &&
    comment.selectedText === snapshot.selectedText &&
    comment.source === snapshot.source
  )
}

// Why: a frozen shared sentinel avoids selector re-renders and mutation.
const EMPTY_COMMENTS: readonly DiffComment[] = Object.freeze([])

// Why: best-effort telemetry runs only after the note is on disk, so a throw here must not report a failed save.
function recordReviewNoteInteraction(get: () => AppState): void {
  try {
    get().recordFeatureInteraction?.('review-notes')
  } catch (err) {
    console.error('Failed to record review-notes interaction:', err)
  }
}

export const createDiffCommentsSlice: StateCreator<AppState, [], [], DiffCommentsSlice> = (
  set,
  get
) => ({
  diffCommentsByWorktree: {},
  diffCommentsLoadedKeys: {},
  getDiffComments: (worktreeId) => {
    // Why: return the stable sentinel for a missing worktree so optional-worktree callers don't allocate a fresh [] and trigger re-renders.
    if (!worktreeId) {
      return EMPTY_COMMENTS as DiffComment[]
    }
    // First read hydrates from SQLite; the read itself stays synchronous so
    // render paths never suspend.
    ensureDiffCommentsLoaded(set, get, worktreeId)
    return (get().diffCommentsByWorktree[worktreeId] ?? EMPTY_COMMENTS) as DiffComment[]
  },

  addDiffComment: async (input) => {
    const comment: DiffComment = normalizeDiffComment({
      ...input,
      id: generateId(),
      createdAt: Date.now()
    })
    const result = mutateDiffComments(set, input.worktreeId, (existing: any) => [...existing, comment])
    if (!result) {
      return null
    }
    try {
      // Why: serialize through the per-worktree queue so concurrent writes can't land on disk out of call order.
      await enqueueDiffCommentPersist(set, input.worktreeId, get, result)
    } catch (err) {
      console.error('Failed to persist diff comments:', err)
      return null
    }
    recordReviewNoteInteraction(get)
    return comment
  },

  updateDiffComment: async (worktreeId, commentId, body) => {
    // Why: reject an empty edit so we never save a note that renders as a blank card; false means "not committed", keep the editor open.
    const trimmed = body.trim()
    if (!trimmed) {
      return false
    }

    // Why: distinguish "comment missing" (false; keep draft, likely edit-while-deleted) from "body unchanged" (true; close editor) before mutating.
    const existing = get().getDiffComments(worktreeId)
    const existingIdx = existing.findIndex((c: any) => c.id === commentId)
    if (existingIdx === -1) {
      return false
    }
    if (existing[existingIdx].body === trimmed) {
      return true
    }

    const result = mutateDiffComments(set, worktreeId, (current: any) => {
      const idx = current.findIndex((c: any) => c.id === commentId)
      if (idx === -1) {
        return null
      }
      if (current[idx].body === trimmed) {
        return null
      }
      const next = current.slice()
      // Why: editing a sent note makes the agent's copy stale, so reset sentAt to re-queue it for the next Send.
      next[idx] = { ...current[idx], body: trimmed, sentAt: undefined }
      return next
    })
    if (!result) {
      // Why: comment vanished or the same body was already written between pre-check and set; treat as success so the editor closes.
      return true
    }
    try {
      await enqueueDiffCommentPersist(set, worktreeId, get, result)
      return true
    } catch (err) {
      console.error('Failed to persist diff comments:', err)
      return false
    }
  },

  clearDeliveredDiffComments: async (worktreeId, comments) => {
    if (comments.length === 0) {
      return true
    }
    const snapshotsById = new Map(comments.map((comment) => [comment.id, comment]))
    const result = mutateDiffComments(set, worktreeId, (existing: any) => {
      const next = existing.filter((comment: any) => {
        const snapshot = snapshotsById.get(comment.id)
        // Why: delivery is async; a note edited after its snapshot was sent is a fresh pending note that must stay visible.
        return !snapshot || !deliverySnapshotMatches(comment, snapshot)
      })
      return next.length === existing.length ? null : next
    })
    if (!result) {
      return true
    }
    try {
      await enqueueDiffCommentPersist(set, worktreeId, get, result)
    } catch (err) {
      console.error('Failed to persist diff comments:', err)
      return false
    }
    recordReviewNoteInteraction(get)
    return true
  },

  markDiffCommentsSent: async (worktreeId, commentIds, sentAt = Date.now()) => {
    if (commentIds.length === 0) {
      return true
    }
    const ids = new Set(commentIds)
    const result = mutateDiffComments(set, worktreeId, (existing: any) => {
      let changed = false
      const next = existing.map((comment: any) => {
        if (!ids.has(comment.id) || comment.sentAt === sentAt) {
          return comment
        }
        changed = true
        return { ...comment, sentAt }
      })
      return changed ? next : null
    })
    if (!result) {
      return true
    }
    try {
      await enqueueDiffCommentPersist(set, worktreeId, get, result)
    } catch (err) {
      console.error('Failed to persist diff comments:', err)
      return false
    }
    recordReviewNoteInteraction(get)
    return true
  },

  deleteDiffComment: async (worktreeId, commentId) => {
    const result = mutateDiffComments(set, worktreeId, (existing: any) => {
      const next = existing.filter((c: any) => c.id !== commentId)
      return next.length === existing.length ? null : next
    })
    if (!result) {
      return
    }
    try {
      // Why: serialize through the per-worktree queue so concurrent writes can't land out of call order.
      await enqueueDiffCommentPersist(set, worktreeId, get, result)
    } catch (err) {
      console.error('Failed to persist diff comments:', err)
    }
  },

  clearDiffComments: async (worktreeId) => {
    const result = mutateDiffComments(set, worktreeId, (existing: any) =>
      existing.length === 0 ? null : []
    )
    if (!result) {
      return true
    }
    try {
      await enqueueDiffCommentPersist(set, worktreeId, get, result)
      return true
    } catch (err) {
      console.error('Failed to persist diff comments:', err)
      return false
    }
  },

  clearDiffCommentsForFile: async (worktreeId, filePath) => {
    const result = mutateDiffComments(set, worktreeId, (existing: any) => {
      const next = existing.filter((c: any) => c.filePath !== filePath)
      return next.length === existing.length ? null : next
    })
    if (!result) {
      return true
    }
    try {
      await enqueueDiffCommentPersist(set, worktreeId, get, result)
      return true
    } catch (err) {
      console.error('Failed to persist diff comments:', err)
      return false
    }
  }
})

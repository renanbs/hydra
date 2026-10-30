// D03a-017 / D03a-021 / D03a-024: one drop-commit surface for every path. The native
// (HTML5) gesture and the document-capture fallback must commit through the same
// context as the pointer drag, refuse a nest whose card is gone, and qualify a
// status/pin write with the host the drag started on.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { commitWorktreeDropAtPoint, resolveWorktreeNestCommit } from './drop-commit'
import type { WorktreeDropCommitContext } from './drop-commit-context'
import { useWorktreeDocumentDrop } from './use-document-drop'
import type { WorktreeDragRuntime } from './use-runtime'
import type { WorktreeDragSession } from './use-session'

const PARENTS = new Map([['child', 'parent']])

const DROP_PREVIEW = {
  dropIndex: 1,
  dropIndicatorY: 44,
  dropAnchorId: null,
  previewOffsetsByWorktreeId: new Map<string, number>()
}

function context(overrides: Partial<WorktreeDropCommitContext> = {}): WorktreeDropCommitContext {
  const scroll = document.createElement('div')
  scroll.getBoundingClientRect = () =>
    ({
      left: 0,
      right: 300,
      top: 0,
      bottom: 400,
      width: 300,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({})
    }) as DOMRect
  return {
    scrollRef: { current: scroll },
    worktreeDragGroups: [{ key: 'repo:1', worktreeIds: ['child'] }],
    worktreeDragUnitGroups: [
      {
        key: 'repo:1',
        worktreeIds: ['child'],
        units: [{ worktreeId: 'child', worktreeIds: ['child'] }]
      }
    ],
    computeWorktreeDrop: vi.fn(() => DROP_PREVIEW),
    computeWorktreeStatusDrop: vi.fn(() => DROP_PREVIEW),
    refreshWorktreeDragSession: () => true,
    clearWorktreeDrag: vi.fn(),
    resolveDraggedWorktreeIds: () => ['child'],
    onReorderWorktrees: vi.fn(),
    onAssignWorktreesStatus: vi.fn(),
    onPinWorktrees: vi.fn(),
    lineageParentIdByChildId: PARENTS,
    onNestWorktrees: vi.fn(),
    onUnnestWorktrees: vi.fn(),
    workspaceBoardOpen: false,
    onWorkspaceBoardDragPreviewStart: vi.fn(),
    onWorkspaceBoardDragPreviewCommit: vi.fn(),
    ...overrides
  }
}

function dragEvent(type: string, x: number, y: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    clientX: { value: x },
    clientY: { value: y }
  })
  return event
}

function sessionRef(): WorktreeDragSession {
  return {
    worktreeDragSessionRef: {
      current: {
        draggingWorktreeId: 'child',
        sourceGroupKey: 'repo:1',
        draggedIds: ['child'],
        reorderDraggedIds: ['child'],
        reorderUnitDraggedIds: ['child'],
        rects: [],
        grab: null,
        anchor: null
      }
    }
  } as unknown as WorktreeDragSession
}

function runtime(overrides: Partial<WorktreeDragRuntime> = {}): WorktreeDragRuntime {
  return {
    worktreePointerDragRef: { current: null },
    nativeDragActiveRef: { current: true },
    dragExecutionHostIdRef: { current: 'ssh:build' },
    clearWorktreeDrag: vi.fn(),
    ...overrides
  } as unknown as WorktreeDragRuntime
}

const elementFromPoint = vi.fn<(x: number, y: number) => Element | null>(() => null)

beforeEach(() => {
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: elementFromPoint
  })
  elementFromPoint.mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  elementFromPoint.mockReset()
  document.body.innerHTML = ''
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
})

describe('the shared drop commit (D03a-024)', () => {
  it('commits a reorder through the same context the pointer path uses', () => {
    const ctx = context()

    const outcome = commitWorktreeDropAtPoint({
      ctx,
      point: { x: 40, y: 120 },
      draggedIds: ['child'],
      reorderDraggedIds: ['child'],
      sourceGroupKey: 'repo:1',
      executionHostId: 'ssh:build'
    })

    expect(outcome).toBe('reorder')
    expect(ctx.onReorderWorktrees).toHaveBeenCalledWith({
      groups: ctx.worktreeDragGroups,
      sourceGroupKey: 'repo:1',
      draggedIds: ['child'],
      dropIndex: 1
    })
    expect(ctx.clearWorktreeDrag).toHaveBeenCalledTimes(1)
  })

  it('abandons a release outside the sidebar band without writing', () => {
    const ctx = context()

    const outcome = commitWorktreeDropAtPoint({
      ctx,
      point: { x: 999, y: 120 },
      draggedIds: ['child'],
      reorderDraggedIds: ['child'],
      sourceGroupKey: 'repo:1'
    })

    expect(outcome).toBe('abandoned')
    expect(ctx.onReorderWorktrees).not.toHaveBeenCalled()
    expect(ctx.clearWorktreeDrag).toHaveBeenCalledTimes(1)
  })

  it('qualifies the status write with the host the drag started on (D03a-021)', () => {
    const lane = document.createElement('div')
    lane.setAttribute('data-workspace-status-drop-target', '')
    lane.setAttribute('data-workspace-status', 'todo')
    document.body.appendChild(lane)
    elementFromPoint.mockReturnValue(lane)
    const ctx = context()

    commitWorktreeDropAtPoint({
      ctx,
      point: { x: 40, y: 120 },
      draggedIds: ['child'],
      reorderDraggedIds: ['child'],
      sourceGroupKey: 'repo:1',
      executionHostId: 'ssh:build'
    })

    expect(ctx.onAssignWorktreesStatus).toHaveBeenCalledWith(
      ['child'],
      'todo',
      'ssh:build'
    )
    expect(ctx.onReorderWorktrees).not.toHaveBeenCalled()
  })
})

describe('nest commits refuse a card that is no longer painted (D03a-017)', () => {
  it('never writes a lineage for a detached card', () => {
    const detached = document.createElement('div')
    detached.setAttribute('data-worktree-nesting-id', 'parent')
    detached.getBoundingClientRect = () =>
      ({ top: 100, bottom: 140, left: 0, right: 300, width: 300, height: 40, x: 0, y: 100, toJSON: () => ({}) }) as DOMRect
    elementFromPoint.mockReturnValue(detached)
    const ctx = context()

    const outcome = commitWorktreeDropAtPoint({
      ctx,
      point: { x: 40, y: 120 },
      draggedIds: ['child'],
      reorderDraggedIds: ['child'],
      sourceGroupKey: 'repo:1'
    })

    expect(outcome).toBe('reorder')
    expect(ctx.onNestWorktrees).not.toHaveBeenCalled()
  })

  it('resolves a nest only while the parent card is painted', () => {
    const painted = document.createElement('div')
    painted.setAttribute('data-worktree-nesting-id', 'parent')
    document.body.appendChild(painted)

    expect(
      resolveWorktreeNestCommit({
        nestingTargetId: 'parent',
        isTargetPainted: (id) =>
          id === 'parent' && document.querySelector(`[data-worktree-nesting-id="${id}"]`) !== null
      })
    ).toBe('parent')
    expect(
      resolveWorktreeNestCommit({ nestingTargetId: 'ghost', isTargetPainted: () => false })
    ).toBeNull()
  })
})

describe('document capture fallback (D03a-017)', () => {
  function renderDocumentDrop(args: { ctx?: WorktreeDropCommitContext } = {}) {
    const ctx = args.ctx ?? context()
    const dragRuntime = runtime()
    renderHook(() => useWorktreeDocumentDrop({ ctx, session: sessionRef(), runtime: dragRuntime }))
    return { ctx, dragRuntime }
  }

  it('commits a native release that lands on the list', () => {
    const { ctx } = renderDocumentDrop()
    const event = dragEvent('drop', 40, 120)

    act(() => {
      document.dispatchEvent(event)
    })

    expect(event.defaultPrevented).toBe(true)
    expect(ctx.onReorderWorktrees).toHaveBeenCalledTimes(1)
    expect(ctx.clearWorktreeDrag).toHaveBeenCalledTimes(1)
  })

  it('abandons a native release outside the list and leaves the event to its owner', () => {
    const { ctx } = renderDocumentDrop()
    const event = dragEvent('drop', 900, 120)

    act(() => {
      document.dispatchEvent(event)
    })

    expect(event.defaultPrevented).toBe(false)
    expect(ctx.onReorderWorktrees).not.toHaveBeenCalled()
    expect(ctx.clearWorktreeDrag).toHaveBeenCalledTimes(1)
  })

  it('abandons the drag when the document is hidden', () => {
    const { ctx } = renderDocumentDrop()

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(ctx.clearWorktreeDrag).toHaveBeenCalledTimes(1)
  })

  it('tears the session down on dragend', () => {
    const { ctx } = renderDocumentDrop()

    act(() => {
      document.dispatchEvent(new Event('dragend'))
    })

    expect(ctx.clearWorktreeDrag).toHaveBeenCalledTimes(1)
  })

  it('ignores a pointer gesture: its own path owns the release', () => {
    const ctx = context()
    const dragRuntime = runtime({
      worktreePointerDragRef: { current: { pointerId: 1 } as never }
    })
    renderHook(() =>
      useWorktreeDocumentDrop({ ctx, session: sessionRef(), runtime: dragRuntime })
    )

    act(() => {
      document.dispatchEvent(dragEvent('drop', 40, 120))
    })

    expect(ctx.onReorderWorktrees).not.toHaveBeenCalled()
  })
})

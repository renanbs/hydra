// The lane's card list is virtualized on the vertical axis: board cards are the sidebar's rich
// cards with variable heights, so the list seeds its window from an estimate, replaces every
// painted card's estimate with its measured height, keeps an overscan beyond the visible window,
// and publishes the measured slots for the card drag.
//
// jsdom has no layout, so the heights here are synthetic: the scroller reports a viewport and
// each painted slot reports the height its index stands for.
import { act, fireEvent, render } from '@testing-library/react'
import React, { useCallback, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GitWorktreeInfo, HydraProject } from '../types'
import WorkspaceBoardStatusLaneCardList from './WorkspaceBoardStatusLaneCardList'
import { getWorkspaceBoardVirtualCardItemCount } from './workspace-board-virtual-card-layout'
import {
  WORKSPACE_BOARD_CARD_GAP,
  estimateWorkspaceBoardCardHeight
} from './workspace-board-virtual-lanes'
import type { WorkspaceBoardCard as WorkspaceBoardCardModel } from './workspace-board-worktrees'

const PROJECT: HydraProject = {
  id: 'repo_1',
  name: 'hydra',
  path: '/repo/hydra',
  is_git: true,
  current_branch: 'main'
}

const LANE_CARD_COUNT = 20
const VIEWPORT_HEIGHT = 200
/** Even slots are short cards, odd slots tall ones: the point is that they differ. */
const SHORT_CARD_HEIGHT = 64
const TALL_CARD_HEIGHT = 120

function worktree(id: string): GitWorktreeInfo {
  return {
    id,
    path: `/repo/hydra/${id}`,
    head_commit: 'abc1234',
    branch: id,
    is_bare: false,
    is_locked: false
  }
}

function card(index: number): WorkspaceBoardCardModel {
  return {
    identity: `|wt-${index}`,
    worktree: worktree(`wt-${index}`),
    project: PROJECT,
    sessions: [],
    activityStatus: 'inactive',
    prDisplay: null,
    ports: [],
    isPinned: false,
    isUnread: false,
    isActive: false,
    laneIndex: index
  }
}

const CARDS: WorkspaceBoardCardModel[] = Array.from({ length: LANE_CARD_COUNT }, (_, index) =>
  card(index)
)

function slotHeight(index: number): number {
  return index % 2 === 0 ? SHORT_CARD_HEIGHT : TALL_CARD_HEIGHT
}

/** The lane's own body: the list's scroll element, with a synthetic viewport. */
function CardListHarness(): React.JSX.Element {
  const [scrollerElement, setScrollerElement] = useState<HTMLDivElement | null>(null)
  const attachScroller = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      Object.defineProperty(node, 'offsetHeight', {
        configurable: true,
        value: VIEWPORT_HEIGHT
      })
    }
    setScrollerElement(node)
  }, [])
  return (
    <div ref={attachScroller} data-workspace-board-card-scroller="">
      <WorkspaceBoardStatusLaneCardList
        cards={CARDS}
        scrollerElement={scrollerElement}
        compactCards={false}
        selectedWorktreeIds={new Set()}
        onSelectionGesture={vi.fn()}
        onActivate={vi.fn()}
      />
    </div>
  )
}

function scroller(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-workspace-board-card-scroller]')
  if (!element) {
    throw new Error('the lane card scroller is not painted')
  }
  return element
}

function paintedSlots(): HTMLElement[] {
  return [...scroller().querySelectorAll<HTMLElement>('[data-index]')]
}

function spacer(): HTMLElement {
  const element = scroller().firstElementChild
  if (!(element instanceof HTMLElement)) {
    throw new Error('the lane card spacer is not painted')
  }
  return element
}

/** jsdom reports every card as 0px tall; each painted slot reports its index's height instead. */
function stubCardHeights(): void {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
    this: HTMLElement
  ): number {
    const index = this.dataset.index
    return index === undefined ? 0 : slotHeight(Number(index))
  })
}

/** Drains the async (non sync-flushed) re-render a measurement or a scroll schedules. */
async function settleCardList(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('WorkspaceBoardStatusLaneCardList', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('measures each card and shifts the next one by the measured height', async () => {
    stubCardHeights()

    render(<CardListHarness />)
    await settleCardList()

    const slots = paintedSlots()
    expect(slots.length).toBeGreaterThan(2)
    // The estimate is one size for every card; the measured heights are not.
    expect(slots[0]?.style.transform).toBe('translateY(0px)')
    expect(slots[1]?.style.transform).toBe(
      `translateY(${SHORT_CARD_HEIGHT + WORKSPACE_BOARD_CARD_GAP}px)`
    )
    expect(slots[2]?.style.transform).toBe(
      `translateY(${SHORT_CARD_HEIGHT + WORKSPACE_BOARD_CARD_GAP + TALL_CARD_HEIGHT + WORKSPACE_BOARD_CARD_GAP}px)`
    )
  })

  it('seeds the cards outside the window from the estimate and the painted ones from their height', async () => {
    stubCardHeights()

    render(<CardListHarness />)
    await settleCardList()

    const slots = paintedSlots()
    const measuredTotal = slots.reduce(
      (total, slot) => total + slotHeight(Number(slot.dataset.index)),
      0
    )
    const estimatedTotal = (LANE_CARD_COUNT - slots.length) * estimateWorkspaceBoardCardHeight(false)
    const expectedTotal =
      measuredTotal + estimatedTotal + (LANE_CARD_COUNT - 1) * WORKSPACE_BOARD_CARD_GAP

    expect(spacer().style.height).toBe(`${expectedTotal}px`)
    expect(expectedTotal).not.toBe(
      LANE_CARD_COUNT * estimateWorkspaceBoardCardHeight(false) +
        (LANE_CARD_COUNT - 1) * WORKSPACE_BOARD_CARD_GAP
    )
  })

  it('paints a window with overscan instead of every card of the lane', async () => {
    stubCardHeights()

    render(<CardListHarness />)
    await settleCardList()

    const slots = paintedSlots()
    expect(slots.length).toBeGreaterThan(0)
    expect(slots.length).toBeLessThan(LANE_CARD_COUNT)
    expect(slots.map((slot) => slot.dataset.index)).toEqual(
      Array.from({ length: slots.length }, (_, index) => String(index))
    )
    expect(scroller().querySelector('[data-workspace-board-card-id="|wt-0"]')).not.toBeNull()
  })

  it('moves the window as the lane scrolls', async () => {
    stubCardHeights()

    render(<CardListHarness />)
    await settleCardList()
    expect(paintedSlots()[0]?.dataset.index).toBe('0')

    const element = scroller()
    Object.defineProperty(element, 'scrollTop', { configurable: true, writable: true, value: 0 })
    await act(async () => {
      element.scrollTop = 1200
      fireEvent.scroll(element)
    })
    await settleCardList()

    expect(Number(paintedSlots()[0]?.dataset.index)).toBeGreaterThan(0)
    expect(scroller().querySelector('[data-workspace-board-card-id="|wt-0"]')).toBeNull()
  })

  it('publishes the lane card count the drop geometry reads', async () => {
    stubCardHeights()

    render(<CardListHarness />)
    await settleCardList()

    expect(getWorkspaceBoardVirtualCardItemCount(scroller())).toBe(LANE_CARD_COUNT)
  })
})

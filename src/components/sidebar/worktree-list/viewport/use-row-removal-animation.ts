// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/viewport/use-row-removal-animation.ts
//
// A deleted row closes its slot in one commit, so every row below it jumps up by the deleted
// row's height. This snapshots the previous window and plays the survivors back from where they
// were, so the list reads as "the row left" instead of "the list teleported".
//
// Adapted to Hydra: Orca follows a `lineage-group` row through its rekey map (a parent key flips
// between `wt:` and `lineage-group:` when it gains its first child). Hydra paints no lineage
// folds, so the identity keys are just the row keys and no rekey map is consulted.
import { useLayoutEffect, useMemo, useRef } from 'react'
import type React from 'react'
import type { VirtualItem } from '@tanstack/react-virtual'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { getRenderRowKey } from '../listing/render-row'
import type { HostSectionRow } from '../../host-section-rows'

export const WORKTREE_ROW_REMOVAL_ANIMATION_MS = 180

export type VirtualRowLayoutSnapshot = {
  rowIdentityKeys: ReadonlySet<string>
  scrollTop: number
  startsByKey: ReadonlyMap<string, number>
}

export type VirtualRowRemovalMotion = {
  deltaY: number
  key: string
}

export function getSidebarRowIdentityKeys(rows: readonly HostSectionRow[]): ReadonlySet<string> {
  const keys = new Set<string>()
  for (const row of rows) {
    keys.add(getRenderRowKey(row))
  }
  return keys
}

export function buildVirtualRowRemovalMotions(args: {
  previous: VirtualRowLayoutSnapshot | null
  current: VirtualRowLayoutSnapshot
}): VirtualRowRemovalMotion[] {
  const { previous, current } = args
  if (previous === null || previous.rowIdentityKeys === current.rowIdentityKeys) {
    return []
  }
  let removedRow = false
  for (const key of previous.rowIdentityKeys) {
    if (!current.rowIdentityKeys.has(key)) {
      removedRow = true
      break
    }
  }
  if (!removedRow) {
    return []
  }

  const motions: VirtualRowRemovalMotion[] = []
  current.startsByKey.forEach((currentStart, key) => {
    const previousStart = previous.startsByKey.get(key)
    if (previousStart === undefined) {
      return
    }
    const deltaY = previousStart - previous.scrollTop - (currentStart - current.scrollTop)
    if (Math.abs(deltaY) > 0.5) {
      motions.push({ deltaY, key })
    }
  })
  return motions
}

export function useVirtualRowRemovalAnimation(args: {
  rows: readonly HostSectionRow[]
  scrollRef: React.RefObject<HTMLDivElement | null>
  virtualItems: readonly VirtualItem[]
}): void {
  const { rows, scrollRef, virtualItems } = args
  const previousSnapshotRef = useRef<VirtualRowLayoutSnapshot | null>(null)
  const rowIdentityKeys = useMemo(() => getSidebarRowIdentityKeys(rows), [rows])
  // Why the hook instead of reading `window.matchMedia` here: it degrades to "no preference"
  // where the API is missing, and re-reads it when the user flips the setting.
  const prefersReducedMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) {
      return
    }
    const current: VirtualRowLayoutSnapshot = {
      rowIdentityKeys,
      scrollTop: scrollElement.scrollTop,
      startsByKey: new Map(virtualItems.map((item) => [String(item.key), item.start]))
    }
    const motions = buildVirtualRowRemovalMotions({
      previous: previousSnapshotRef.current,
      current
    })
    previousSnapshotRef.current = current
    if (motions.length === 0 || prefersReducedMotion) {
      return
    }

    const elementsByKey = new Map(
      Array.from(
        scrollElement.querySelectorAll<HTMLElement>('[data-worktree-virtual-row-key]')
      ).map((element) => [element.dataset.worktreeVirtualRowKey ?? '', element])
    )
    for (const motion of motions) {
      const element = elementsByKey.get(motion.key)
      // Why skip the pinned row: it is painted sticky at the top of the viewport, not at the
      // slot it would animate from — playing the motion would drag it out of the pin.
      if (!element || element.hasAttribute('data-worktree-sticky-header-active')) {
        continue
      }
      const content = element.firstElementChild
      if (!(content instanceof HTMLElement)) {
        continue
      }
      content.animate([{ translate: `0 ${motion.deltaY}px` }, { translate: '0 0' }], {
        duration: WORKTREE_ROW_REMOVAL_ANIMATION_MS,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      })
    }
  }, [prefersReducedMotion, rowIdentityKeys, scrollRef, virtualItems])
}

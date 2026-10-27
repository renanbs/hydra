/**
 * The worktree surfaces' shared multi-selection model: a selected id set plus its anchor,
 * and the three gestures that move it.
 *
 * Ported from Orca `worktree-multi-selection` and generalized from the workspace board (which
 * had it first, D08-031): both the board's cards and the sidebar list's rows read
 * host-qualified identities (`getWorktreeHostIdentity`), so one model serves both surfaces and
 * two hosts publishing the same workspace id never collapse into one entry.
 *
 * Why the model is pure: the pointer, the marquee and the keyboard all funnel into these
 * functions, and the DOM layer only decides *which* ids a gesture covers. `jsdom` has no
 * layout, so every rule the marquee follows has to be answerable from ids alone.
 */

export type WorktreeSelectionIntent = 'replace' | 'toggle' | 'range'

export type WorktreeSelectionResult = {
  selectedIds: Set<string>
  anchorId: string
}

export type WorktreeAreaSelectionResult = {
  selectedIds: Set<string>
  anchorId: string | null
}

/**
 * Which of the three selection gestures a modified click performs. `shift` wins over the
 * toggle modifier — Orca's order, so a Shift+Ctrl click extends the range instead of
 * toggling one card off.
 */
export function getWorktreeSelectionIntent(
  event: Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey'>,
  isMac: boolean
): WorktreeSelectionIntent {
  if (event.shiftKey) {
    return 'range'
  }
  const toggle = isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
  return toggle ? 'toggle' : 'replace'
}

/**
 * The selection a click produces. `visibleIds` is the surface's *rendered* order — the cards a
 * search left on screen, or the rows the virtualizer painted — so a range never runs through an
 * entry the user cannot see, while a plain click and a toggle still replace it and prune it away.
 */
export function updateWorktreeSelection(params: {
  visibleIds: readonly string[]
  previousSelectedIds: ReadonlySet<string>
  previousAnchorId: string | null
  targetId: string
  intent: WorktreeSelectionIntent
}): WorktreeSelectionResult {
  const { visibleIds, previousSelectedIds, previousAnchorId, targetId, intent } = params

  if (intent === 'replace') {
    return { selectedIds: new Set([targetId]), anchorId: targetId }
  }

  if (intent === 'toggle') {
    const next = new Set(previousSelectedIds)
    if (next.has(targetId)) {
      next.delete(targetId)
    } else {
      next.add(targetId)
    }
    return { selectedIds: next, anchorId: targetId }
  }

  const anchorId = previousAnchorId
  if (!anchorId) {
    return { selectedIds: new Set([targetId]), anchorId: targetId }
  }
  const targetIndex = visibleIds.indexOf(targetId)
  const anchorIndex = visibleIds.indexOf(anchorId)
  if (targetIndex === -1 || anchorIndex === -1) {
    return { selectedIds: new Set([targetId]), anchorId: targetId }
  }

  const start = Math.min(anchorIndex, targetIndex)
  const end = Math.max(anchorIndex, targetIndex)
  return {
    selectedIds: new Set(visibleIds.slice(start, end + 1)),
    anchorId
  }
}

/**
 * Drops ids the surface no longer holds — a workspace left the sidebar's filter, the search
 * changed, a worktree was deleted — and re-anchors onto a survivor when the anchor is gone.
 */
export function pruneWorktreeSelection(
  selectedIds: ReadonlySet<string>,
  anchorId: string | null,
  visibleIds: readonly string[]
): { selectedIds: Set<string>; anchorId: string | null } {
  const visible = new Set(visibleIds)
  const next = new Set<string>()
  for (const id of selectedIds) {
    if (visible.has(id)) {
      next.add(id)
    }
  }
  return {
    selectedIds: next,
    anchorId: anchorId && visible.has(anchorId) ? anchorId : (next.values().next().value ?? null)
  }
}

/**
 * The selection a marquee commit produces. The area's ids are re-ordered by the surface's own
 * order, so the anchor is a stable entry rather than wherever the pointer happened to sweep
 * last; additive mode unions with the selection the drag started from.
 */
export function updateWorktreeAreaSelection(params: {
  visibleIds: readonly string[]
  previousSelectedIds: ReadonlySet<string>
  previousAnchorId: string | null
  areaIds: readonly string[]
  additive: boolean
}): WorktreeAreaSelectionResult {
  const { visibleIds, previousSelectedIds, previousAnchorId, areaIds, additive } = params
  const areaIdSet = new Set(areaIds)
  const orderedAreaIds = visibleIds.filter((id) => areaIdSet.has(id))

  if (additive) {
    const selectedIds = new Set(previousSelectedIds)
    for (const id of orderedAreaIds) {
      selectedIds.add(id)
    }
    return {
      selectedIds,
      anchorId: orderedAreaIds.at(-1) ?? previousAnchorId
    }
  }

  return {
    selectedIds: new Set(orderedAreaIds),
    anchorId: orderedAreaIds.at(-1) ?? null
  }
}

/** Select-all (the keyboard path) over the entries the surface currently paints. */
export function selectAllWorktreeVisible(
  visibleIds: readonly string[]
): WorktreeAreaSelectionResult {
  return {
    selectedIds: new Set(visibleIds),
    anchorId: visibleIds.at(-1) ?? null
  }
}

export function areWorktreeSelectionsEqual(
  a: ReadonlySet<string>,
  b: ReadonlySet<string>
): boolean {
  if (a.size !== b.size) {
    return false
  }
  for (const id of a) {
    if (!b.has(id)) {
      return false
    }
  }
  return true
}

/**
 * The anchor a *range* click must extend from when the search hid the original one: the first
 * still-rendered selected entry. `updateWorktreeSelection` reads an anchor missing from
 * `visibleIds` as "no anchor" and collapses the range to the clicked entry, so re-anchoring
 * first keeps Shift+click extending from what the user can actually see.
 *
 * Returns `null` when the anchor is fine and the caller should keep it.
 */
export function resolveWorktreeRenderedAnchorId(
  renderedIds: readonly string[],
  selectedIds: ReadonlySet<string>,
  anchorId: string
): string | null {
  if (renderedIds.includes(anchorId)) {
    return null
  }
  return renderedIds.find((id) => selectedIds.has(id)) ?? null
}

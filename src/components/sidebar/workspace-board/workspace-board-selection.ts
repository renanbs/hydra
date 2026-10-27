/**
 * The board's multi-selection model: the selected id set plus its anchor, and the three
 * gestures that move it.
 *
 * Ported from Orca `worktree-multi-selection`: the board reads host-qualified identities
 * (`getWorktreeHostIdentity`), so a card is addressed by the same id the sidebar's own
 * selection uses, and two hosts publishing the same workspace id never collapse into one
 * card here.
 *
 * Why the model is pure: the pointer, the marquee and the keyboard all funnel into these
 * functions, and the DOM layer only decides *which* ids a gesture covers. `jsdom` has no
 * layout, so every rule the marquee follows has to be answerable from ids alone.
 */

export type WorkspaceBoardSelectionIntent = 'replace' | 'toggle' | 'range'

export type WorkspaceBoardSelectionResult = {
  selectedIds: Set<string>
  anchorId: string
}

export type WorkspaceBoardAreaSelectionResult = {
  selectedIds: Set<string>
  anchorId: string | null
}

/**
 * Which of the three selection gestures a modified click performs. `shift` wins over the
 * toggle modifier — Orca's order, so a Shift+Ctrl click extends the range instead of
 * toggling one card off.
 */
export function getWorkspaceBoardSelectionIntent(
  event: Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey'>,
  isMac: boolean
): WorkspaceBoardSelectionIntent {
  if (event.shiftKey) {
    return 'range'
  }
  const toggle = isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
  return toggle ? 'toggle' : 'replace'
}

/**
 * The selection a click produces. `visibleIds` is the board's *rendered* order — the cards a
 * search left on screen — so a range never runs through a card the user cannot see, while a
 * plain click and a toggle still replace it and prune it away.
 */
export function updateWorkspaceBoardSelection(params: {
  visibleIds: readonly string[]
  previousSelectedIds: ReadonlySet<string>
  previousAnchorId: string | null
  targetId: string
  intent: WorkspaceBoardSelectionIntent
}): WorkspaceBoardSelectionResult {
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
 * Drops ids the board no longer holds — a workspace left the sidebar's filter, the search
 * changed, a worktree was deleted — and re-anchors onto a survivor when the anchor is gone.
 */
export function pruneWorkspaceBoardSelection(
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
 * The selection a marquee commit produces. The area's ids are re-ordered by the board's own
 * order, so the anchor is a stable card rather than wherever the pointer happened to sweep
 * last; additive mode unions with the selection the drag started from.
 */
export function updateWorkspaceBoardAreaSelection(params: {
  visibleIds: readonly string[]
  previousSelectedIds: ReadonlySet<string>
  previousAnchorId: string | null
  areaIds: readonly string[]
  additive: boolean
}): WorkspaceBoardAreaSelectionResult {
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

/** Select-all (the board's keyboard path) over the cards the board currently paints. */
export function selectAllWorkspaceBoardVisible(
  visibleIds: readonly string[]
): WorkspaceBoardAreaSelectionResult {
  return {
    selectedIds: new Set(visibleIds),
    anchorId: visibleIds.at(-1) ?? null
  }
}

export function areWorkspaceBoardSelectionsEqual(
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
 * still-rendered selected card. `updateWorkspaceBoardSelection` reads an anchor missing from
 * `visibleIds` as "no anchor" and collapses the range to the clicked card, so re-anchoring
 * first keeps Shift+click extending from what the user can actually see.
 *
 * Returns `null` when the anchor is fine and the caller should keep it.
 */
export function resolveWorkspaceBoardRenderedAnchorId(
  renderedIds: readonly string[],
  selectedIds: ReadonlySet<string>,
  anchorId: string
): string | null {
  if (renderedIds.includes(anchorId)) {
    return null
  }
  return renderedIds.find((id) => selectedIds.has(id)) ?? null
}

/**
 * True while a key event belongs to a text field rather than to the board: the search field, an
 * inline rename, a `contenteditable` — or xterm's hidden input textarea, which is *not* a real
 * text field, so treating it as one would block the board's shortcuts while a terminal has focus.
 */
export function isWorkspaceBoardTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (target.classList.contains('xterm-helper-textarea')) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  return target.closest('input, textarea, select, [contenteditable=""]') !== null
}

/**
 * True when a keydown is the board's select-all (`Mod+A`, the web-first convention for
 * "select every item the surface is showing"). The board's cards are not a listbox, so the
 * shortcut is scoped to the board element and guarded against text fields by the caller.
 */
export function isWorkspaceBoardSelectAllShortcut(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>
): boolean {
  return (
    event.key.toLowerCase() === 'a' &&
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey
  )
}

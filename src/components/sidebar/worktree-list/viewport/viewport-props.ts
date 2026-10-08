import type React from 'react'
import type { HostSectionRow } from '../../host-section-rows'
import type { PinnedWorktreeDisplayPolicy, WorktreeRow } from '../grouping/row-types'

/** What the virtual slot hands the row it wraps (D03a-103 — the viewport's props contract). */
export type WorktreeVirtualRowSlot = {
  /** Collapse/expand this row's section; the scroll anchor is recorded first. */
  toggleCollapse: () => void
  /** Listbox option id, when the row is a focus target (item and folder-workspace rows). */
  optionId?: string
  /** True when this row paints the workspace that is active right now. */
  isActive: boolean
}

/**
 * Props of the virtualized workspaces viewport.
 *
 * Adapted to Hydra: Orca's viewport takes the store, the drag runtime and every card
 * callback directly because it also owns row rendering. Here the viewport owns the window and
 * the listbox, and the list hands it the row content through `renderRow` — so the props are the
 * viewport's own inputs (window, identity, keyboard, reveal) plus the collapse/activate actions
 * the rows need.
 */
export type VirtualizedWorktreeViewportProps = {
  rows: HostSectionRow[]
  /** Row key of the active workspace, i.e. the row `aria-activedescendant` points at. */
  activeRowKey: string | null
  pinnedDisplayPolicy: PinnedWorktreeDisplayPolicy
  /** Workspace or folder path the list must bring into view; null when nothing is revealed. */
  revealPath: string | null
  renderRow: (row: HostSectionRow, slot: WorktreeVirtualRowSlot) => React.ReactNode
  /** Arrow-key navigation activated this row. */
  onActivateRow: (row: WorktreeRow) => void
  /** The row's section must collapse or expand. */
  onToggleRowCollapse: (row: HostSectionRow) => void
  /** Insertion line for an in-flight drag; painted with the rows so it shares their coordinates. */
  dropIndicator?: React.ReactNode
  /**
   * The list's scroll container. The viewport renders it and assigns it here, so the caller's
   * ref (drag geometry, anchor recording, reveal) stays pointed at the real scroller.
   */
  scrollRef: React.RefObject<HTMLDivElement | null>
  className?: string
}

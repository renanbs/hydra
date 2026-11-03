// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-details-hover-state.ts
import { useCallback, useRef, useState } from 'react'

type WorktreeCardDetailMenu = 'issue' | 'review'

export interface WorktreeCardDetailsHoverControl {
  /** The card should render open: either hovered or holding an open menu. */
  hoverOpen: boolean
  issueMenuOpen: boolean
  reviewMenuOpen: boolean
  handleHoverOpenChange: (next: boolean) => void
  handleIssueMenuOpenChange: (next: boolean) => void
  handleReviewMenuOpenChange: (next: boolean) => void
  /** Close the card and any menu it owns, ignoring deferred closes. */
  closeHover: () => void
}

/**
 * Open/close state for the workspace details hover, with an interlock for the
 * menus it portals.
 *
 * Why: dropdowns rendered through a portal sit outside the hover card's DOM, so
 * Radix's own pointer-leave fires while the menu is still open. The card stays
 * mounted until the menu closes, then honours the deferred close.
 */
export function useWorktreeCardDetailsHoverControl(): WorktreeCardDetailsHoverControl {
  const [open, setOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<WorktreeCardDetailMenu | null>(null)
  const pendingHoverCloseRef = useRef(false)

  const closeHover = useCallback(() => {
    pendingHoverCloseRef.current = false
    setOpenMenu(null)
    setOpen(false)
  }, [])

  const handleHoverOpenChange = useCallback(
    (next: boolean) => {
      if (openMenu) {
        pendingHoverCloseRef.current = !next
        return
      }
      pendingHoverCloseRef.current = false
      setOpen(next)
    },
    [openMenu]
  )

  const setDetailMenuOpen = useCallback((menu: WorktreeCardDetailMenu, next: boolean) => {
    setOpenMenu(next ? menu : null)
    if (!next && pendingHoverCloseRef.current) {
      pendingHoverCloseRef.current = false
      setOpen(false)
    }
  }, [])

  return {
    hoverOpen: open || Boolean(openMenu),
    issueMenuOpen: openMenu === 'issue',
    reviewMenuOpen: openMenu === 'review',
    handleHoverOpenChange,
    handleIssueMenuOpenChange: (next: boolean) => setDetailMenuOpen('issue', next),
    handleReviewMenuOpenChange: (next: boolean) => setDetailMenuOpen('review', next),
    closeHover
  }
}

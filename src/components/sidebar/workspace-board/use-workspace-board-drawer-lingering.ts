import { useEffect, useState } from 'react'

/**
 * Matches the sheet's `data-[state=closed]:duration-200` exit transition with a
 * little headroom, so the drawer is not torn down mid-animation.
 */
const WORKSPACE_BOARD_CLOSE_LINGER_MS = 300

/**
 * Ported from Orca `useWorkspaceKanbanDrawerLingering`: the board stays mounted
 * for one animation after it closes, so the sheet slides out instead of blinking.
 */
export function useWorkspaceBoardDrawerLingering(open: boolean): boolean {
  const [lingering, setLingering] = useState(open)
  useEffect(() => {
    if (open) {
      setLingering(true)
      return
    }
    const timer = window.setTimeout(() => setLingering(false), WORKSPACE_BOARD_CLOSE_LINGER_MS)
    return () => window.clearTimeout(timer)
  }, [open])
  return lingering
}

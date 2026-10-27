/**
 * The attribute names are the module's contract: the board's CSS (`App.css`) and the drag
 * tests both key off them, so they live here and nowhere else.
 */
const BOARD_POINTER_DRAGGING_ATTR = 'data-workspace-board-pointer-dragging'
const CARD_DRAGGING_ATTR = 'data-workspace-board-card-pointer-dragging'
const DRAG_PREVIEW_ATTR = 'data-workspace-board-card-drag-preview'
const DRAG_CARD_ATTR = 'data-workspace-board-card-drag-card'

export function setWorkspaceBoardCardDragDocumentStyles(enabled: boolean): void {
  document.body.style.cursor = enabled ? 'grabbing' : ''
  document.body.style.userSelect = enabled ? 'none' : ''
  document.documentElement.toggleAttribute(BOARD_POINTER_DRAGGING_ATTR, enabled)
}

/** Ghosts the card the drag lifted, so the slot it came from reads as vacated. */
export function setWorkspaceBoardDraggedCard(card: HTMLElement, dragging: boolean): void {
  card.toggleAttribute(CARD_DRAGGING_ATTR, dragging)
}

/**
 * Why the preview lives on the body: the sheet animates and the lane row scrolls, so a
 * preview nested in either would be clipped by (or dragged along with) its own ancestors.
 */
export function createWorkspaceBoardCardDragPreview(args: {
  sourceCard: HTMLElement
  pointerX: number
  pointerY: number
}): { preview: HTMLElement; offsetX: number; offsetY: number } {
  const rect = args.sourceCard.getBoundingClientRect()
  const preview = document.createElement('div')
  const clone = args.sourceCard.cloneNode(true) as HTMLElement
  // Why: the clone keeps the grab point the user pressed, so the floating card sits
  // under the pointer exactly where the real one did.
  const offsetX = Math.min(Math.max(args.pointerX - rect.left, 0), rect.width)
  const offsetY = Math.min(Math.max(args.pointerY - rect.top, 0), rect.height)

  clone.setAttribute(DRAG_CARD_ATTR, 'true')
  stripDuplicatePreviewAttributes(clone)
  preview.setAttribute(DRAG_PREVIEW_ATTR, 'true')
  preview.setAttribute('aria-hidden', 'true')
  preview.appendChild(clone)
  preview.style.position = 'fixed'
  preview.style.left = '0'
  preview.style.top = '0'
  preview.style.width = `${rect.width}px`
  preview.style.height = `${rect.height}px`
  preview.style.pointerEvents = 'none'
  document.body.appendChild(preview)

  updateWorkspaceBoardCardDragPreviewPosition({
    preview,
    pointerX: args.pointerX,
    pointerY: args.pointerY,
    offsetX,
    offsetY
  })
  return { preview, offsetX, offsetY }
}

/**
 * Hooks the clone must not carry: the preview is appended to the body, where a second
 * copy of the card's identity would be counted by the board's lane queries, by the drag's
 * own card lookups, and by anything that asks how many cards are painted.
 */
const DUPLICATE_PREVIEW_ATTRS = [
  'data-workspace-board-card-id',
  'data-workspace-board-worktree-id',
  'data-workspace-board-worktree-path',
  CARD_DRAGGING_ATTR,
  'id',
  'aria-describedby'
]

function stripDuplicatePreviewAttributes(clone: HTMLElement): void {
  const strip = (element: HTMLElement): void => {
    for (const attribute of DUPLICATE_PREVIEW_ATTRS) {
      element.removeAttribute(attribute)
    }
  }
  strip(clone)
  clone
    .querySelectorAll<HTMLElement>(DUPLICATE_PREVIEW_ATTRS.map((attr) => `[${attr}]`).join(','))
    .forEach(strip)
}

export function updateWorkspaceBoardCardDragPreviewPosition(args: {
  preview: HTMLElement
  pointerX: number
  pointerY: number
  offsetX: number
  offsetY: number
}): void {
  args.preview.style.setProperty(
    'transform',
    `translate3d(${args.pointerX - args.offsetX}px, ${args.pointerY - args.offsetY}px, 0)`
  )
}

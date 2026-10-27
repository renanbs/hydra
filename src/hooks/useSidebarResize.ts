import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

type UseSidebarResizeOptions = {
  isOpen: boolean
  width: number
  minWidth: number
  maxWidth: number
  deltaSign: 1 | -1
  renderedExtraWidth?: number
  /** Width a double-click on the handle restores (Orca parity: sidebar reset). */
  defaultWidth?: number
  setWidth: (width: number) => void
  onDraftWidthChange?: (width: number) => void
}

type UseSidebarResizeResult<T extends HTMLElement> = {
  containerRef: React.RefObject<T | null>
  isResizing: boolean
  onResizeStart: (event: React.PointerEvent) => void
  /** Restores `defaultWidth` (clamped) as the committed sidebar width. */
  onResizeReset: () => void
}

export function clampSidebarResizeWidth(width: number, minWidth: number, maxWidth: number): number {
  return Math.min(maxWidth, Math.max(minWidth, width))
}

export function getRenderedSidebarWidthCssValue(
  isOpen: boolean,
  width: number,
  renderedExtraWidth: number
): string {
  return isOpen ? `${width + renderedExtraWidth}px` : '0px'
}

export function getNextSidebarResizeWidth({
  clientX,
  startX,
  startWidth,
  deltaSign,
  minWidth,
  maxWidth
}: {
  clientX: number
  startX: number
  startWidth: number
  deltaSign: 1 | -1
  minWidth: number
  maxWidth: number
}): number {
  const delta = (clientX - startX) * deltaSign
  return clampSidebarResizeWidth(startWidth + delta, minWidth, maxWidth)
}

export function useSidebarResize<T extends HTMLElement>({
  isOpen,
  width,
  minWidth,
  maxWidth,
  deltaSign,
  renderedExtraWidth = 0,
  defaultWidth,
  setWidth,
  onDraftWidthChange
}: UseSidebarResizeOptions): UseSidebarResizeResult<T> {
  const containerRef = useRef<T | null>(null)
  const isResizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(width)
  const draftWidthRef = useRef(width)
  const frameRef = useRef<number | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const captureElementRef = useRef<Element | null>(null)
  const capturePointerIdRef = useRef<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  const removeDragOverlay = useCallback(() => {
    const overlay = overlayRef.current
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay)
    }
    overlayRef.current = null
  }, [])

  const releasePointerCapture = useCallback(() => {
    const element = captureElementRef.current
    const pointerId = capturePointerIdRef.current
    captureElementRef.current = null
    capturePointerIdRef.current = null
    if (!element || pointerId === null) {
      return
    }
    if (element.hasPointerCapture?.(pointerId)) {
      element.releasePointerCapture(pointerId)
    }
  }, [])

  const resetDocumentStyles = useCallback(() => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    removeDragOverlay()
    releasePointerCapture()
  }, [releasePointerCapture, removeDragOverlay])

  const applyRenderedWidth = useCallback(
    (nextWidth: number) => {
      const container = containerRef.current
      if (!container) {
        return
      }

      // Why: sidebar containers intentionally keep live drag width out of
      // React props. Any unrelated rerender during a drag would otherwise
      // snap the DOM width back to the last persisted store value and make the
      // handle feel like it is lagging behind the pointer.
      container.style.width = getRenderedSidebarWidthCssValue(isOpen, nextWidth, renderedExtraWidth)
    },
    [isOpen, renderedExtraWidth]
  )

  useLayoutEffect(() => {
    if (isResizingRef.current) {
      return
    }

    draftWidthRef.current = width
    applyRenderedWidth(width)
    onDraftWidthChange?.(width)
  }, [applyRenderedWidth, onDraftWidthChange, width])

  const stopResize = useCallback(() => {
    if (!isResizingRef.current) {
      return
    }

    isResizingRef.current = false
    setIsResizing(false)

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    resetDocumentStyles()

    const finalWidth = draftWidthRef.current
    applyRenderedWidth(finalWidth)
    onDraftWidthChange?.(finalWidth)
    if (finalWidth !== width) {
      setWidth(finalWidth)
    }
  }, [applyRenderedWidth, onDraftWidthChange, resetDocumentStyles, setWidth, width])

  const onResizeReset = useCallback(() => {
    if (defaultWidth === undefined) {
      return
    }
    const nextWidth = clampSidebarResizeWidth(defaultWidth, minWidth, maxWidth)
    draftWidthRef.current = nextWidth
    applyRenderedWidth(nextWidth)
    onDraftWidthChange?.(nextWidth)
    setWidth(nextWidth)
  }, [applyRenderedWidth, defaultWidth, maxWidth, minWidth, onDraftWidthChange, setWidth])

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isResizingRef.current) {
        return
      }

      const nextWidth = getNextSidebarResizeWidth({
        clientX: event.clientX,
        startX: startXRef.current,
        startWidth: startWidthRef.current,
        deltaSign,
        minWidth,
        maxWidth
      })
      if (nextWidth === draftWidthRef.current) {
        return
      }

      draftWidthRef.current = nextWidth
      if (frameRef.current !== null) {
        return
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        applyRenderedWidth(draftWidthRef.current)
        onDraftWidthChange?.(draftWidthRef.current)
      })
    },
    [applyRenderedWidth, deltaSign, maxWidth, minWidth, onDraftWidthChange]
  )

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopResize)
    window.addEventListener('blur', stopResize)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopResize)
      window.removeEventListener('blur', stopResize)

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }

      isResizingRef.current = false
      resetDocumentStyles()
    }
  }, [handleMouseMove, resetDocumentStyles, stopResize])

  const onResizeStart = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault()
      isResizingRef.current = true
      setIsResizing(true)
      startXRef.current = event.clientX
      startWidthRef.current = width
      draftWidthRef.current = width
      onDraftWidthChange?.(width)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      // Why: capture the pointer on the handle so a drag that leaves the 3px
      // strip (or crosses a WebKitGTK <embed>) keeps delivering move/up events
      // to this element. The window listeners below still run — the capture
      // only pins the event target, and the overlay still protects against
      // native embeds that swallow events before they bubble.
      const captureTarget = event.currentTarget as Element | null
      if (captureTarget?.setPointerCapture) {
        captureTarget.setPointerCapture(event.pointerId)
        captureElementRef.current = captureTarget
        capturePointerIdRef.current = event.pointerId
      }

      // Why: native plugins like Chromium's PDF <embed> capture pointer events
      // internally, so dragging across them swallows the `mouseup` on the
      // window and the resize never stops — the sidebar ends up following the
      // cursor indefinitely. A full-viewport transparent overlay above all
      // content keeps mouse events flowing to the window listeners for the
      // duration of the drag.
      if (!overlayRef.current) {
        const overlay = document.createElement('div')
        overlay.style.position = 'fixed'
        overlay.style.inset = '0'
        overlay.style.zIndex = '2147483647'
        overlay.style.cursor = 'col-resize'
        overlay.style.background = 'transparent'
        document.body.appendChild(overlay)
        overlayRef.current = overlay
      }
    },
    [onDraftWidthChange, width]
  )

  return { containerRef, isResizing, onResizeStart, onResizeReset }
}

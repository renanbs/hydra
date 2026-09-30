// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'

export function isSidebarLabelTruncated(
  element: Pick<HTMLElement, 'clientWidth' | 'scrollWidth'>
): boolean {
  return element.scrollWidth > element.clientWidth
}

export interface TruncatedSidebarLabelProps {
  text: string
  className?: string
  tooltipEnabled?: boolean
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
  tooltipSideOffset?: number
}

export function TruncatedSidebarLabel({
  text,
  className,
  tooltipEnabled = true,
}: TruncatedSidebarLabelProps): React.JSX.Element {
  const nodeRef = useRef<HTMLSpanElement | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const removeResizeListenerRef = useRef<(() => void) | null>(null)
  const [truncated, setTruncated] = useState(false)

  const measureTruncated = useCallback((element: HTMLSpanElement | null) => {
    const nextTruncated = element ? isSidebarLabelTruncated(element) : false
    setTruncated((current) => (current === nextTruncated ? current : nextTruncated))
  }, [])

  const handleRef = useCallback(
    (node: HTMLSpanElement | null): void => {
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      removeResizeListenerRef.current?.()
      removeResizeListenerRef.current = null

      nodeRef.current = node
      if (!node) {
        measureTruncated(null)
        return
      }

      measureTruncated(node)
      const updateTruncated = () => measureTruncated(node)
      if (typeof ResizeObserver === 'undefined') {
        window.addEventListener('resize', updateTruncated)
        removeResizeListenerRef.current = () =>
          window.removeEventListener('resize', updateTruncated)
        return
      }

      const observer = new ResizeObserver(updateTruncated)
      observer.observe(node)
      resizeObserverRef.current = observer
    },
    [measureTruncated]
  )

  useLayoutEffect(() => {
    measureTruncated(nodeRef.current)
  }, [measureTruncated, text])

  return (
    <span
      ref={handleRef}
      className={`block min-w-0 truncate ${className ?? ''}`}
      title={tooltipEnabled && truncated ? text : undefined}
    >
      {text}
    </span>
  )
}

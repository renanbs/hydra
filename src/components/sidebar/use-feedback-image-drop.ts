// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-feedback-image-drop.ts
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { hasNativeFileDragTypes } from '@/shared/native-file-drop'
import { extractImageFilesFromDataTransfer } from '@/lib/feedback-image-attachments'

type FeedbackImageDragHandlers = {
  onDragEnter: (event: React.DragEvent<HTMLElement>) => void
  onDragOver: (event: React.DragEvent<HTMLElement>) => void
  onDragLeave: (event: React.DragEvent<HTMLElement>) => void
}

export type FeedbackImageDrop = {
  isDragActive: boolean
  contentRef: React.RefObject<HTMLDivElement | null>
  dragHandlers: FeedbackImageDragHandlers
}

/**
 * Drag-and-drop attachment wiring for the feedback dialog.
 *
 * DataTransfer.files is empty until the drop lands, so the highlight keys off
 * the drag types the OS advertises during the drag itself.
 */
export function useFeedbackImageDrop(
  open: boolean,
  onAddFiles: (files: readonly File[]) => void
): FeedbackImageDrop {
  const [isDragActive, setIsDragActive] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const dragDepthRef = useRef(0)

  const reset = useCallback(() => {
    dragDepthRef.current = 0
    setIsDragActive(false)
  }, [])

  const onDragEnter = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!hasNativeFileDragTypes(event.dataTransfer.types)) {
      return
    }
    dragDepthRef.current += 1
    setIsDragActive(true)
  }, [])

  // Why: without preventDefault on dragover the browser refuses the drop and
  // navigates to the dropped file.
  const onDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!hasNativeFileDragTypes(event.dataTransfer.types)) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDragLeave = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!hasNativeFileDragTypes(event.dataTransfer.types)) {
      return
    }
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setIsDragActive(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    const handleDrop = (event: DragEvent): void => {
      const droppedInDialog = contentRef.current?.contains(event.target as Node) ?? false
      reset()
      if (!droppedInDialog || !hasNativeFileDragTypes(event.dataTransfer?.types)) {
        return
      }
      // Why: an accepted dragover plus an uncancelled drop is what makes the
      // browser navigate to the file, wiping the typed feedback.
      event.preventDefault()
      const images = extractImageFilesFromDataTransfer(event.dataTransfer)
      if (images.length === 0) {
        return
      }
      event.stopPropagation()
      onAddFiles(images)
    }
    window.addEventListener('drop', handleDrop, true)
    window.addEventListener('dragend', reset, true)
    return () => {
      window.removeEventListener('drop', handleDrop, true)
      window.removeEventListener('dragend', reset, true)
      // Why: a dialog closed mid-drag would otherwise reopen mid-highlight.
      reset()
    }
  }, [onAddFiles, open, reset])

  return { isDragActive, contentRef, dragHandlers: { onDragEnter, onDragOver, onDragLeave } }
}

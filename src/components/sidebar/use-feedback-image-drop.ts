// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-feedback-image-drop.ts
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { hasNativeFileDragTypes } from '../../shared/native-file-drop'
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
 * Drag-and-drop attachment wiring for the feedback dialog. The drop is claimed
 * on window capture so a screenshot dropped over the dialog attaches instead of
 * being routed to the editor/native lane behind it.
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

  // Why: DataTransfer.files is empty until the drop lands, so the highlight has
  // to key off the drag types the OS advertises during the drag itself.
  const onDragEnter = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!hasNativeFileDragTypes(event.dataTransfer.types)) {
      return
    }
    dragDepthRef.current += 1
    setIsDragActive(true)
  }, [])

  // Why: without an accepted dragover the browser refuses the drop and
  // navigates to the dropped file, discarding the typed feedback.
  const onDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!hasNativeFileDragTypes(event.dataTransfer.types)) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDragLeave = useCallback((event: React.DragEvent<HTMLElement>) => {
    // Why: mirror the enter guard so internal drags can't decrement a counter
    // enter never incremented.
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
      // Why: dragover accepted this drag, and a drop left uncancelled after that
      // is what makes the browser navigate to the file — including the non-image
      // drops below, which would otherwise wipe the typed feedback.
      event.preventDefault()
      const images = extractImageFilesFromDataTransfer(event.dataTransfer)
      if (images.length === 0) {
        return
      }
      // Why: stop the native-drop lane from also opening the screenshot in an
      // editor behind the dialog.
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

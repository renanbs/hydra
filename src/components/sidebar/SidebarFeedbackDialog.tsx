// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/SidebarFeedbackDialog.tsx
// Feedback composer mounted from the sidebar footer. The screenshot lane is the
// part that needs care: a drop or paste over the dialog must attach to this
// dialog instead of being claimed by the editor/terminal lane behind it, and a
// rejected attachment must say why rather than disappearing.
import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import {
  extractImageFilesFromDataTransfer,
  hasAttachableFeedbackImage,
} from '@/lib/feedback-image-attachments'
import { submitSidebarFeedback } from '@/lib/sidebar-feedback-submit'
import { stripClientEnvironmentFooter } from '../../shared/client-environment-info'
import { SidebarFeedbackImageAttachments } from './SidebarFeedbackImageAttachments'
import { useSidebarFeedbackEnvironmentPrefill } from './use-sidebar-feedback-environment-prefill'
import { useSidebarFeedbackImages } from './use-sidebar-feedback-images'

export type SidebarFeedbackDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SidebarFeedbackDialog({
  open,
  onOpenChange,
}: SidebarFeedbackDialogProps): React.JSX.Element {
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const mountedRef = useMountedRef()
  const feedbackTextareaRef = useRef<HTMLTextAreaElement>(null)
  const {
    images,
    pendingImageReadCount,
    isDragActive,
    contentRef,
    dragHandlers,
    handleAddFiles,
    handleRemoveImage,
    clearImages,
    hasPendingImageReads,
    getReservedImageSlots,
  } = useSidebarFeedbackImages({ open, isSubmitting, mountedRef })

  useSidebarFeedbackEnvironmentPrefill({
    open,
    feedback,
    setFeedback,
    textareaRef: feedbackTextareaRef,
    mountedRef,
  })

  // Why: the composer stays mounted between opens (dialog close animation), so a
  // refusal from the previous attempt must not greet the next one.
  useEffect(() => {
    if (!open) setSubmitError(null)
  }, [open])

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitting || hasPendingImageReads()) {
      return
    }
    const trimmed = feedback.trim()
    const userText = stripClientEnvironmentFooter(feedback).trim()
    if (!trimmed || !userText) {
      toast.warning(
        translate(
          'auto.components.sidebar.SidebarFeedbackDialog.a2fd890d9e',
          'Please enter feedback before submitting.'
        )
      )
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const result = await submitSidebarFeedback({
        feedback: trimmed,
        // Hydra has no account identity in the renderer; the environment footer
        // above carries the version/OS details the backend needs.
        submitAnonymously: true,
        githubLogin: null,
        githubEmail: null,
        images: images.map((image) => ({
          contentType: image.contentType,
          data: image.data,
        })),
      })

      if (!result.ok) {
        const message = translate(
          'auto.components.sidebar.SidebarFeedbackDialog.60b721e857',
          'Failed to submit feedback. Please try again.'
        )
        if (mountedRef.current) {
          setSubmitError(result.error ? `${message} (${result.error})` : message)
          toast.error(message)
        }
        return
      }

      if (mountedRef.current) {
        // Why: the text reached us but the screenshots did not, so say that
        // plainly instead of a blanket success the user would misread.
        if (result.imagesDelivered === false) {
          toast.warning(
            translate(
              'auto.components.sidebar.SidebarFeedbackDialog.imagesNotDelivered',
              'Feedback sent, but image delivery could not be confirmed.'
            )
          )
        } else {
          toast.success(
            translate(
              'auto.components.sidebar.SidebarFeedbackDialog.7a46c228b8',
              'Thanks for the feedback.'
            )
          )
        }
        setFeedback('')
        clearImages()
        onOpenChange(false)
      }
    } catch (error) {
      if (mountedRef.current) {
        setSubmitError(
          translate(
            'auto.components.sidebar.SidebarFeedbackDialog.60b721e857',
            'Failed to submit feedback. Please try again.'
          )
        )
        toast.error(
          translate(
            'auto.components.sidebar.SidebarFeedbackDialog.60b721e857',
            'Failed to submit feedback. Please try again.'
          )
        )
      }
      console.error('Failed to submit feedback:', error)
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        className="max-h-[calc(100vh-3rem)] overflow-y-auto scrollbar-sleek sm:max-w-lg"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          feedbackTextareaRef.current?.focus()
        }}
        // Why: paste is bound on the dialog rather than the textarea so a
        // screenshot lands whether or not the caret is in the message box.
        onPaste={(event) => {
          const pasted = extractImageFilesFromDataTransfer(event.clipboardData)
          if (pasted.length === 0) {
            return
          }
          // Why: consume the paste only when something is actually attachable.
          // An unsupported image still routes through for its rejection toast,
          // but preventing default there would silently eat co-pasted text.
          if (hasAttachableFeedbackImage(pasted, getReservedImageSlots())) {
            event.preventDefault()
          }
          handleAddFiles(pasted)
        }}
        // Why: dragenter/leave fire per nested child; the hook counts depth so
        // the highlight only clears once the pointer leaves the dialog.
        {...dragHandlers}
      >
        <DialogHeader>
          <DialogTitle className="text-sm">
            {translate(
              'auto.components.sidebar.SidebarFeedbackDialog.0eb643f07f',
              'Send Feedback'
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {translate(
              'auto.components.sidebar.SidebarFeedbackDialog.hydraSubtitle',
              "Share what's working, what's broken, or what Hydra should do next."
            )}
          </DialogDescription>
        </DialogHeader>

        <textarea
          ref={feedbackTextareaRef}
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder={translate(
            'auto.components.sidebar.SidebarFeedbackDialog.d46ddd66fc',
            'What could we improve?'
          )}
          aria-label={translate(
            'auto.components.sidebar.SidebarFeedbackDialog.d46ddd66fc',
            'What could we improve?'
          )}
          rows={7}
          className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />

        <SidebarFeedbackImageAttachments
          images={images}
          disabled={isSubmitting}
          isDragActive={isDragActive}
          onAddFiles={handleAddFiles}
          onRemove={handleRemoveImage}
        />

        {submitError ? (
          <p className="break-words text-[11px] text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {translate('auto.components.sidebar.SidebarFeedbackDialog.8bf619e4cf', 'Cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              isSubmitting ||
              pendingImageReadCount > 0 ||
              stripClientEnvironmentFooter(feedback).trim() === ''
            }
          >
            {isSubmitting
              ? translate('auto.components.sidebar.SidebarFeedbackDialog.69969ba364', 'Sending…')
              : translate('auto.components.sidebar.SidebarFeedbackDialog.f2e42e1307', 'Send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

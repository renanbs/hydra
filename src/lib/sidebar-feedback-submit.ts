import { invoke } from '@tauri-apps/api/core'

export type SidebarFeedbackImagePayload = {
  contentType: string
  data: Uint8Array
}

export type SidebarFeedbackSubmission = {
  feedback: string
  submitAnonymously: boolean
  githubLogin: string | null
  githubEmail: string | null
  images: readonly SidebarFeedbackImagePayload[]
}

export type SidebarFeedbackSubmitResult = {
  ok: boolean
  error?: string
  /** False when the text landed but the screenshots could not be confirmed. */
  imagesDelivered?: boolean
}

/**
 * Orca submits feedback through the main process (`window.api.feedback.submit`)
 * because a file:// renderer cannot POST cross-origin. Hydra has no preload and
 * no feedback endpoint yet, so this resolves the first surface that exists: the
 * Orca bridge when a host provides it, otherwise the `submit_sidebar_feedback`
 * command. A missing command comes back as an explicit refusal the dialog shows
 * — never a fabricated success.
 */
export async function submitSidebarFeedback(
  submission: SidebarFeedbackSubmission
): Promise<SidebarFeedbackSubmitResult> {
  // Why: the ambient window.api declaration types unknown keys as `any`; read
  // the bridge as `unknown` and narrow it before calling.
  const bridge: unknown = window.api?.feedback?.submit
  if (typeof bridge === 'function') {
    try {
      // Why the cast: `typeof bridge === 'function'` only proves callability, so
      // the bridge contract is asserted once, here, and the result is narrowed.
      const submit = bridge as (input: SidebarFeedbackSubmission) => Promise<unknown>
      const result = await submit(submission)
      if (result && typeof result === 'object' && 'ok' in result && typeof result.ok === 'boolean') {
        const error = 'error' in result && typeof result.error === 'string' ? result.error : null
        const imagesDelivered =
          'imagesDelivered' in result && typeof result.imagesDelivered === 'boolean'
            ? result.imagesDelivered
            : undefined
        return {
          ok: result.ok,
          ...(error ? { error } : {}),
          ...(imagesDelivered === false ? { imagesDelivered: false } : {}),
        }
      }
      return { ok: false, error: 'Feedback request returned an unexpected response.' }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  }
  try {
    return await invoke<SidebarFeedbackSubmitResult>('submit_sidebar_feedback', {
      request: submission,
    })
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

import type { ContextualTourId } from '../../shared/contextual-tours'
import { useAppStore } from '@/store'

type RequestContextualTourWhenReadyArgs = {
  id: ContextualTourId
  source: string
  wasFeaturePreviouslyInteracted?: boolean
  maxAttempts?: number
  retryDelayMs?: number
  waitForActiveTourToClear?: boolean
  shouldContinue?: () => boolean
}

export type { RequestContextualTourWhenReadyArgs }

/**
 * The live store composes the UI slice at runtime but its declared shape does
 * not repeat the slice's members, so the tour handoff narrows the few keys it
 * drives instead of spraying `any` across the call sites.
 */
type ContextualTourStore = {
  activeContextualTourId: ContextualTourId | null
  requestContextualTour: (
    id: ContextualTourId,
    source: string,
    wasFeaturePreviouslyInteracted?: boolean,
    options?: { force?: boolean }
  ) => void
}

/**
 * Ported from Orca `request-contextual-tour-when-ready`: explicit tour requests
 * often follow a surface that mounts a frame later (a dialog, a lazy panel), so
 * retry until the request sticks or the attempt budget runs out.
 */
export function requestContextualTourWhenReady(
  args: RequestContextualTourWhenReadyArgs
): () => void {
  const maxAttempts = args.maxAttempts ?? 20
  const retryDelayMs = args.retryDelayMs ?? 100
  let attempts = 0
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let cancelled = false

  const attempt = (): void => {
    if (cancelled) {
      return
    }
    if (args.shouldContinue && !args.shouldContinue()) {
      cancelled = true
      return
    }
    attempts += 1

    const before = useAppStore.getState() as unknown as ContextualTourStore
    if (before.activeContextualTourId && before.activeContextualTourId !== args.id) {
      if (args.waitForActiveTourToClear && attempts < maxAttempts) {
        timeoutId = setTimeout(attempt, retryDelayMs)
      }
      return
    }

    before.requestContextualTour(args.id, args.source, args.wasFeaturePreviouslyInteracted, {
      force: true
    })

    const after = useAppStore.getState() as unknown as ContextualTourStore
    if (after.activeContextualTourId === args.id || attempts >= maxAttempts) {
      return
    }
    timeoutId = setTimeout(attempt, retryDelayMs)
  }

  timeoutId = setTimeout(attempt, 0)

  return () => {
    cancelled = true
    clearTimeout(timeoutId)
  }
}

// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: src/renderer/src/lib/ime-composition-keyboard-event.ts
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

type ImeKeyboardEvent = {
  isComposing?: boolean
  keyCode?: number
  nativeEvent?: { isComposing?: boolean; keyCode?: number }
}

/**
 * True when the IME, rather than the app, owns a keyboard event.
 *
 * Why both fields: `isComposing` covers most browsers, while `keyCode === 229` is the
 * fallback for IMEs that only mark the keydown with the legacy "processed by IME" code.
 */
export function isImeOwnedKeyboardEvent<KeyEvent extends ImeKeyboardEvent>(
  event: KeyEvent
): boolean {
  return (
    event.isComposing === true ||
    event.keyCode === 229 ||
    event.nativeEvent?.isComposing === true ||
    event.nativeEvent?.keyCode === 229
  )
}

/**
 * Why: CJK IMEs fire a keydown for the Enter that only confirms a conversion candidate.
 * A picker that commits on `Enter` must ignore that keydown, otherwise it selects a
 * candidate mid-composition with a half-converted query.
 */
export function isImeCompositionKeyDown(event: ReactKeyboardEvent): boolean {
  return isImeOwnedKeyboardEvent(event)
}

// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/workspace-delete-quick-action.ts
// Option/Alt is a transient reveal modifier for the card's destructive quick
// action. The state lives in a module store read through `useSyncExternalStore`
// so every card reacts to one set of listeners, and stale key state after focus
// loss can never leave a destructive affordance visible.
import { useSyncExternalStore } from 'react'

let deleteModifierPressed = false
let listenersInstalled = false
const listeners = new Set<() => void>()

function notifyListeners(): void {
  for (const listener of listeners) {
    listener()
  }
}

function setDeleteModifierPressed(next: boolean): void {
  if (deleteModifierPressed === next) {
    return
  }
  deleteModifierPressed = next
  notifyListeners()
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.altKey || event.key === 'Alt') {
    setDeleteModifierPressed(true)
  }
}

function onKeyUp(event: KeyboardEvent): void {
  if (event.key === 'Alt' || !event.altKey) {
    setDeleteModifierPressed(false)
  }
}

function clearDeleteModifierPressed(): void {
  setDeleteModifierPressed(false)
}

function installListeners(): void {
  if (listenersInstalled || typeof window === 'undefined') {
    return
  }
  listenersInstalled = true
  window.addEventListener('keydown', onKeyDown, { capture: true })
  window.addEventListener('keyup', onKeyUp, { capture: true })
  window.addEventListener('blur', clearDeleteModifierPressed)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', clearDeleteModifierPressed)
  }
}

function uninstallListeners(): void {
  if (!listenersInstalled || typeof window === 'undefined') {
    return
  }
  listenersInstalled = false
  window.removeEventListener('keydown', onKeyDown, { capture: true })
  window.removeEventListener('keyup', onKeyUp, { capture: true })
  window.removeEventListener('blur', clearDeleteModifierPressed)
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', clearDeleteModifierPressed)
  }
  clearDeleteModifierPressed()
}

function subscribeDeleteModifier(listener: () => void): () => void {
  listeners.add(listener)
  installListeners()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      uninstallListeners()
    }
  }
}

function getDeleteModifierSnapshot(): boolean {
  return deleteModifierPressed
}

function getServerDeleteModifierSnapshot(): boolean {
  return false
}

export function useWorkspaceDeleteModifierPressed(): boolean {
  return useSyncExternalStore(
    subscribeDeleteModifier,
    getDeleteModifierSnapshot,
    getServerDeleteModifierSnapshot
  )
}

/** Test-only reset; unmounting the last subscriber also clears it. */
export function resetWorkspaceDeleteModifierForTests(): void {
  clearDeleteModifierPressed()
}

/**
 * Orca `canShowWorkspaceDeleteQuickAction`: the trash affordance is gated on the
 * held modifier, and is never offered for an in-flight delete or the primary
 * checkout.
 */
export function canShowWorkspaceDeleteQuickAction(args: {
  deleteModifierPressed: boolean
  isDeleting: boolean
  isMainWorktree: boolean
}): boolean {
  return args.deleteModifierPressed && !args.isDeleting && !args.isMainWorktree
}

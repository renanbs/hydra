// Ported from Orca (`renderer/src/components/sidebar/prompt-cache-countdown-clock.ts`).
//
// One shared 1s clock behind every prompt-cache countdown, so N sidebar cards do
// not each own an interval (the pre-port Hydra CacheTimer started one per card).
// It stops itself once the last subscriber leaves and pauses while the window is
// hidden.
import { useSyncExternalStore } from "react";
import { isWindowVisible } from "../../lib/window-visibility-interval";

type Listener = () => void;

let currentNow = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
let stopVisibilityWatcher: (() => void) | null = null;
const listeners = new Set<Listener>();

function publishTick(): void {
  currentNow = Date.now();
  for (const listener of listeners) {
    listener();
  }
}

function stopTimer(): void {
  if (timer === null) {
    return;
  }
  clearInterval(timer);
  timer = null;
}

function startTimer(): void {
  if (timer !== null || !isWindowVisible()) {
    return;
  }
  timer = setInterval(publishTick, 1000);
}

function reconcileVisibility(): void {
  if (isWindowVisible()) {
    publishTick();
    startTimer();
  } else {
    stopTimer();
  }
}

function startClock(): void {
  if (stopVisibilityWatcher !== null) {
    return;
  }
  startTimer();
  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", reconcileVisibility);
    stopVisibilityWatcher = () => {
      document.removeEventListener("visibilitychange", reconcileVisibility);
    };
  } else {
    stopVisibilityWatcher = () => {};
  }
}

function stopClock(): void {
  stopTimer();
  stopVisibilityWatcher?.();
  stopVisibilityWatcher = null;
}

export function subscribePromptCacheCountdownClock(listener: Listener): () => void {
  listeners.add(listener);
  // Why: the clock only runs while a countdown is visible. Refresh immediately on
  // subscribe so a card mounted after a long idle period does not render a stale
  // module-load timestamp for one second.
  currentNow = Date.now();
  listener();
  startClock();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopClock();
    }
  };
}

function getPromptCacheCountdownNow(): number {
  return currentNow;
}

function subscribeInactivePromptCacheCountdown(): () => void {
  return () => {};
}

function getInactivePromptCacheCountdownNow(): number {
  return 0;
}

export function usePromptCacheCountdownNow(active: boolean): number {
  return useSyncExternalStore(
    active ? subscribePromptCacheCountdownClock : subscribeInactivePromptCacheCountdown,
    active ? getPromptCacheCountdownNow : getInactivePromptCacheCountdownNow,
    active ? getPromptCacheCountdownNow : getInactivePromptCacheCountdownNow
  );
}

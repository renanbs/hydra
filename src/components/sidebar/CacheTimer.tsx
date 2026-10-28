// Ported from Orca (`renderer/src/components/sidebar/CacheTimer.tsx`).
// Source: components/sidebar/CacheTimer.tsx
//
// Per-worktree prompt-cache countdown shown in the sidebar worktree card. Prompt
// caching (Anthropic API / Bedrock) has a TTL (default 5 min): when the cache
// expires the next request re-sends the whole conversation as UNCACHED input tokens
// (up to 10x more expensive). The countdown lets a user decide whether to resume
// before it drops.
//
// The pre-port Hydra component owned one 1s interval per card and returned null on
// expiry, so it never alerted. It now reads the single shared clock
// (`prompt-cache-countdown-clock.ts`) and paints Orca's three states: muted while
// healthy, yellow inside the last minute, red (icon only) once expired.
import React from "react";
import { Timer } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "../../lib/utils";
import { translate } from "../../i18n/i18n";
import { useAppStore } from "../../store";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { usePromptCacheCountdownNow } from "./prompt-cache-countdown-clock";
import {
  getMostUrgentPromptCacheStartedAt,
  getPromptCacheCountdownForPane,
  type PromptCacheCountdownSelection,
} from "./prompt-cache-timer-selection";

const DEFAULT_PROMPT_CACHE_TTL_MS = 300_000;

/** Stable empty map so a store without the terminal slice does not re-render every pass. */
const EMPTY_CACHE_TIMERS: Record<string, number | null> = {};

/**
 * The pane→cache-start map is declared on the ported TERMINAL slice
 * (`store/slices/terminals.ts`), which is not composed into `useAppStore` yet —
 * this sidebar increment does not own the terminal pipeline. Read the field
 * structurally so the countdown paints as soon as that slice (and its seeding
 * callers) lands, without this reader being blocked by a field the live store does
 * not declare.
 */
function readCacheTimerByKey(state: unknown): Record<string, number | null> {
  const record = state as { cacheTimerByKey?: Record<string, number | null> };
  return record.cacheTimerByKey ?? EMPTY_CACHE_TIMERS;
}

/**
 * Tolerant read of the cache-timer settings. Hydra's settings slice is not hydrated
 * at boot and the terminal seeding path already treats an absent blob as enabled
 * (`pty-connection/command-inferred-pane-agent.ts`), so the countdown agrees with
 * the seeding that created the timer rather than staying permanently inert.
 */
function readPromptCacheSettings(settings: unknown): { enabled: boolean; ttlMs: number } {
  if (!settings || typeof settings !== "object") {
    return { enabled: true, ttlMs: DEFAULT_PROMPT_CACHE_TTL_MS };
  }
  const record = settings as { promptCacheTimerEnabled?: unknown; promptCacheTtlMs?: unknown };
  return {
    enabled: record.promptCacheTimerEnabled !== false,
    ttlMs:
      typeof record.promptCacheTtlMs === "number" && record.promptCacheTtlMs > 0
        ? record.promptCacheTtlMs
        : DEFAULT_PROMPT_CACHE_TTL_MS,
  };
}

/**
 * The most-urgent cache start time when a countdown should show, else null. The
 * worktree card uses it to both gate its metadata row and feed {@link CacheTimer},
 * so neither subscribes twice to the same store slices.
 *
 * `worktreeId` is the store's worktree key (`tabsByWorktree` is keyed by path in
 * Hydra, exactly like the terminal store writers).
 *
 * When a worktree has multiple Claude tabs this resolves the MOST URGENT (shortest
 * remaining) start time — if any tab's cache is about to expire, the user should know.
 */
export function usePromptCacheCountdownStartedAt(
  worktreeId: string,
  active = true
): number | null {
  return useAppStore((s) => {
    if (!active) {
      return null;
    }
    const settings = readPromptCacheSettings(s.settings);
    if (!settings.enabled) {
      return null;
    }
    return getMostUrgentPromptCacheStartedAt(
      s.tabsByWorktree?.[worktreeId],
      readCacheTimerByKey(s)
    );
  });
}

/** TTL the aggregate card countdown renders with; 0 while the timer is inactive. */
export function usePromptCacheTtlMs(active = true): number {
  return useAppStore((s) => (active ? readPromptCacheSettings(s.settings).ttlMs : 0));
}

export function usePromptCacheCountdownForPane(
  paneKey: string,
  active = true
): PromptCacheCountdownSelection | null {
  return useAppStore(
    useShallow((s) => {
      if (!active) {
        return null;
      }
      const settings = readPromptCacheSettings(s.settings);
      if (!settings.enabled) {
        return null;
      }
      return getPromptCacheCountdownForPane(paneKey, readCacheTimerByKey(s), settings.ttlMs);
    })
  );
}

export interface CacheTimerProps {
  startedAt: number;
  ttlMs: number;
}

export function CacheTimer({ startedAt, ttlMs }: CacheTimerProps): React.JSX.Element {
  const now = usePromptCacheCountdownNow(true);
  const remainingMs = Math.max(0, ttlMs - (now - startedAt));

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const label = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const expired = remainingMs === 0;
  const warning = !expired && remainingMs <= 60_000;

  const tooltipText = expired
    ? translate(
        "components.cacheTimer.expired",
        "The next message will re-send the full context as uncached tokens"
      )
    : translate("components.cacheTimer.remaining", "Prompt cache expires in {{remaining}}", {
        remaining: label,
      });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="timer"
          aria-label={tooltipText}
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-mono tabular-nums select-none leading-none",
            expired ? "text-red-400" : warning ? "text-yellow-400" : "text-muted-foreground"
          )}
        >
          <Timer className="size-2.5" />
          {/* When expired, the red icon alone conveys state — the countdown text is
              only meaningful while the cache is still alive. */}
          {!expired && <span>{label}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <span>{tooltipText}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export default CacheTimer;

// Project (repo) header order persistence (D03b-029).
//
// Hydra historically kept the manual project order in `localStorage`. That is per-webview
// and lost with a cleared profile, while the rest of the sidebar's manual order lives in
// the SQLite UI prefs. This module writes the same order through the existing
// `save_sidebar_pref` IPC (no new backend command) and still reads the legacy
// localStorage key so an older profile migrates on first use.
import { invoke } from "@tauri-apps/api/core";

export const PROJECT_ORDER_PREF_KEY = "ui.projectsOrder";
const LEGACY_PROJECT_ORDER_STORAGE_KEY = "hydra:projects_order";

function sanitizeOrder(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const ids = value.filter((id): id is string => typeof id === "string" && id.length > 0);
  return ids.length > 0 ? ids : null;
}

function readLegacyOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_PROJECT_ORDER_STORAGE_KEY);
    return raw ? sanitizeOrder(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Reads the persisted project order: SQLite pref first, legacy localStorage as fallback. */
export async function readProjectOrderPreference(): Promise<string[] | null> {
  try {
    const stored = await invoke<string | null>("get_sidebar_pref", {
      key: PROJECT_ORDER_PREF_KEY,
    });
    if (stored) {
      const parsed = sanitizeOrder(JSON.parse(stored));
      if (parsed) {
        return parsed;
      }
    }
  } catch {
    // A missing/failed pref is not fatal: fall through to the legacy key.
  }
  return readLegacyOrder();
}

/** Persists the project order and mirrors it to the legacy key for downgrade safety. */
export function persistProjectOrderPreference(projectIds: readonly string[]): void {
  const order = [...projectIds];
  void invoke("save_sidebar_pref", {
    key: PROJECT_ORDER_PREF_KEY,
    json: JSON.stringify(order),
  }).catch(() => {});
  try {
    localStorage.setItem(LEGACY_PROJECT_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Quota/private mode: the SQLite write above is the durable copy.
  }
}

/** Sorts projects by a persisted id order; unknown ids keep their relative position last. */
export function orderItemsByProjectOrder<T extends { id: string; path?: string }>(
  items: readonly T[],
  order: readonly string[] | null
): T[] {
  if (!order || order.length === 0) {
    return [...items];
  }
  const rankById = new Map(order.map((id, index) => [id, index]));
  const rankOf = (item: T): number =>
    rankById.get(item.id) ?? (item.path ? (rankById.get(item.path) ?? order.length) : order.length);
  return [...items].sort((left, right) => rankOf(left) - rankOf(right));
}

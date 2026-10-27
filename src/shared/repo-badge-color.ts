// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: shared/repo-badge-color.ts
import { DEFAULT_REPO_BADGE_COLOR, REPO_COLORS } from "./constants";

const HEX_COLOR_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Normalized `#rrggbb` from a palette entry, custom picker value, or null when invalid. */
export function normalizeRepoBadgeColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const match = value.trim().match(HEX_COLOR_PATTERN);
  if (!match) {
    return null;
  }
  const rawHex = match[1].toLowerCase();
  const hex =
    rawHex.length === 3
      ? rawHex
          .split("")
          .map((part) => part + part)
          .join("")
      : rawHex;
  const normalized = `#${hex}`;
  return REPO_COLORS.find((repoColor) => repoColor === normalized) ?? normalized;
}

export function resolveRepoBadgeColor(value: unknown): string {
  return normalizeRepoBadgeColor(value) ?? DEFAULT_REPO_BADGE_COLOR;
}

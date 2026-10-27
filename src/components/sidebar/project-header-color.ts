// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/project-header-color.ts
import { DEFAULT_REPO_BADGE_COLOR, REPO_COLORS } from "../../shared/constants";
import { normalizeRepoBadgeColor } from "../../shared/repo-badge-color";

const PROJECT_GROUP_HEADER_KEY_PREFIX = "repo:";
const PROVIDER_PROJECT_HEADER_KEY_PREFIX = "project:";

/** Persisted colors render as inline CSS, so only normalized hex reaches the header. */
export function resolveRepoHeaderColor(color: string | null | undefined): string {
  const normalized = normalizeRepoBadgeColor(color);
  if (!normalized) {
    return DEFAULT_REPO_BADGE_COLOR;
  }
  return REPO_COLORS.find((candidate) => candidate === normalized) ?? normalized;
}

/** Only real project headers inherit user-authored project colors. */
export function resolveProjectGroupHeaderColor(args: {
  groupBy: string;
  headerKey: string;
  color: string | null | undefined;
}): string | undefined {
  if (
    args.groupBy !== "repo" ||
    (!args.headerKey.startsWith(PROJECT_GROUP_HEADER_KEY_PREFIX) &&
      !args.headerKey.startsWith(PROVIDER_PROJECT_HEADER_KEY_PREFIX))
  ) {
    return undefined;
  }
  return resolveRepoHeaderColor(args.color);
}

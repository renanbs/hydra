// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `src/shared/worktree/visibility-sources.ts` +
// `visibility-source-preferences.ts` + `external-worktree-visibility.ts`, reduced to the
// fields Hydra's catalog carries. Pure functions only: the dialog renders them, the Rust
// catalog persists them, and tests pin the precedence without mounting anything.
import { normalizeRuntimePathForComparison } from "@/shared/cross-platform-path";

export type ExternalWorktreeVisibility = "show" | "hide";

/** Orca built-in source ids (`BUILT_IN_WORKTREE_VISIBILITY_SOURCES`). */
export type BuiltInWorktreeVisibilitySourceId = "claude" | "gsd";

export interface CustomWorktreeVisibilitySource {
  id: string;
  rootPath: string;
}

export interface WorktreeVisibilitySourcePreferences {
  builtIn?: Partial<Record<BuiltInWorktreeVisibilitySourceId, ExternalWorktreeVisibility>>;
  custom?: Record<string, ExternalWorktreeVisibility>;
}

/** Shape of the global `worktree_visibility_defaults` setting Hydra already persists. */
export interface WorktreeVisibilityDefaults {
  external?: ExternalWorktreeVisibility;
  customSources?: CustomWorktreeVisibilitySource[];
  sourcePreferences?: WorktreeVisibilitySourcePreferences;
}

/** Repo fields the resolver reads; a structural subset of `HydraProject`/`CatalogRepo`. */
export interface WorktreeVisibilityRepoConfig {
  externalWorktreeVisibility?: ExternalWorktreeVisibility | null;
  externalWorktreeVisibilityLegacy?: boolean | null;
  customWorktreeVisibilitySources?: CustomWorktreeVisibilitySource[] | null;
  worktreeVisibilitySourcePreferences?: WorktreeVisibilitySourcePreferences | null;
}

export type WorktreeVisibilitySourceMatch =
  | { kind: "built-in"; id: BuiltInWorktreeVisibilitySourceId }
  | { kind: "custom"; id: string };

export type WorktreeVisibilitySourceRow =
  | { kind: "built-in"; id: BuiltInWorktreeVisibilitySourceId }
  | { kind: "custom"; source: CustomWorktreeVisibilitySource }
  | { kind: "other" };

export const MAX_CUSTOM_WORKTREE_VISIBILITY_SOURCES = 32;
const MAX_SOURCE_ID_LENGTH = 128;
const MAX_SOURCE_PATH_LENGTH = 4096;

/** Orca `BUILT_IN_WORKTREE_VISIBILITY_SOURCES`, with the labels/paths the dialog shows. */
export const BUILT_IN_WORKTREE_VISIBILITY_SOURCES: readonly {
  id: BuiltInWorktreeVisibilitySourceId;
  label: string;
  path: string;
  relativeRootSegments: readonly string[];
}[] = [
  { id: "claude", label: "Claude Code", path: ".claude/worktrees/*", relativeRootSegments: [".claude", "worktrees"] },
  { id: "gsd", label: "GSD", path: ".gsd-workspaces/*", relativeRootSegments: [".gsd-workspaces"] },
];

export const OTHER_LOCATIONS_SOURCE_PATH = "Outside listed sources";
export const OTHER_LOCATIONS_SOURCE_LABEL = "Other locations";

const SOURCE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Orca `normalizeCustomWorktreeVisibilitySources`: drop invalid/duplicate ids and roots. */
export function normalizeCustomWorktreeVisibilitySources(
  value: unknown
): CustomWorktreeVisibilitySource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = new Set<string>();
  const roots = new Set<string>();
  const normalized: CustomWorktreeVisibilitySource[] = [];
  for (const candidate of value) {
    if (normalized.length >= MAX_CUSTOM_WORKTREE_VISIBILITY_SOURCES) break;
    if (!candidate || typeof candidate !== "object") continue;
    const { id, rootPath } = candidate as { id?: unknown; rootPath?: unknown };
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      id.length > MAX_SOURCE_ID_LENGTH ||
      !SOURCE_ID_PATTERN.test(id) ||
      typeof rootPath !== "string"
    ) {
      continue;
    }
    const trimmedRoot = rootPath.trim();
    const invalidRoot =
      !trimmedRoot ||
      trimmedRoot.length > MAX_SOURCE_PATH_LENGTH ||
      trimmedRoot.includes("\0") ||
      (trimmedRoot.startsWith("\\") && !trimmedRoot.startsWith("\\\\")) ||
      !(trimmedRoot.startsWith("/") || trimmedRoot.startsWith("\\\\") || /^[A-Za-z]:[\\/]/.test(trimmedRoot));
    if (invalidRoot) continue;
    const rootKey = normalizeRuntimePathForComparison(trimmedRoot);
    if (!rootKey || ids.has(id) || roots.has(rootKey)) continue;
    ids.add(id);
    roots.add(rootKey);
    normalized.push({ id, rootPath: trimmedRoot });
  }
  return normalized;
}

/** Orca `normalizeWorktreeVisibilitySourcePreferences`. */
export function normalizeWorktreeVisibilitySourcePreferences(
  value: unknown
): WorktreeVisibilitySourcePreferences | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as { builtIn?: unknown; custom?: unknown };
  const builtInValue =
    raw.builtIn && typeof raw.builtIn === "object" && !Array.isArray(raw.builtIn)
      ? (raw.builtIn as Record<string, unknown>)
      : {};
  const builtIn: WorktreeVisibilitySourcePreferences["builtIn"] = {};
  for (const { id } of BUILT_IN_WORKTREE_VISIBILITY_SOURCES) {
    const visibility = builtInValue[id];
    if (visibility === "show" || visibility === "hide") builtIn[id] = visibility;
  }
  const customValue =
    raw.custom && typeof raw.custom === "object" && !Array.isArray(raw.custom)
      ? (raw.custom as Record<string, unknown>)
      : {};
  const custom: Record<string, ExternalWorktreeVisibility> = {};
  for (const [id, visibility] of Object.entries(customValue).slice(
    0,
    MAX_CUSTOM_WORKTREE_VISIBILITY_SOURCES
  )) {
    if (
      SOURCE_ID_PATTERN.test(id) &&
      id.length > 0 &&
      id.length <= MAX_SOURCE_ID_LENGTH &&
      (visibility === "show" || visibility === "hide")
    ) {
      custom[id] = visibility;
    }
  }
  return {
    ...(Object.keys(builtIn).length > 0 ? { builtIn } : {}),
    ...(Object.keys(custom).length > 0 ? { custom } : {}),
  } as WorktreeVisibilitySourcePreferences;
}

function repoPreferences(
  repo: WorktreeVisibilityRepoConfig | null | undefined
): WorktreeVisibilitySourcePreferences | undefined {
  return normalizeWorktreeVisibilitySourcePreferences(repo?.worktreeVisibilitySourcePreferences);
}

function repoCustomSources(
  repo: WorktreeVisibilityRepoConfig | null | undefined
): CustomWorktreeVisibilitySource[] | undefined {
  return normalizeCustomWorktreeVisibilitySources(repo?.customWorktreeVisibilitySources);
}

/**
 * Orca `resolveCustomWorktreeVisibilitySources`: the repo's own list wins when it exists;
 * otherwise the global list is the fallback the dialog can override.
 */
export function resolveCustomWorktreeVisibilitySources(
  repo: WorktreeVisibilityRepoConfig | null | undefined,
  defaults?: WorktreeVisibilityDefaults
): CustomWorktreeVisibilitySource[] {
  const repoOwn = repoCustomSources(repo);
  if (repoOwn !== undefined) return repoOwn;
  return normalizeCustomWorktreeVisibilitySources(defaults?.customSources) ?? [];
}

/** Orca `isLegacyRepoForExternalWorktreeVisibility` (rollout constant not carried by Hydra). */
export function isLegacyRepoForExternalWorktreeVisibility(
  repo: WorktreeVisibilityRepoConfig | null | undefined
): boolean {
  if (typeof repo?.externalWorktreeVisibilityLegacy === "boolean") {
    return repo.externalWorktreeVisibilityLegacy;
  }
  return repo?.externalWorktreeVisibility == null;
}

/** Orca `effectiveExternalWorktreeVisibility`: project override → global → legacy show. */
export function effectiveExternalWorktreeVisibility(
  repo: WorktreeVisibilityRepoConfig | null | undefined,
  defaults?: WorktreeVisibilityDefaults
): ExternalWorktreeVisibility {
  if (repo?.externalWorktreeVisibility) return repo.externalWorktreeVisibility;
  if (defaults?.external === "show" || defaults?.external === "hide") return defaults.external;
  return isLegacyRepoForExternalWorktreeVisibility(repo) ? "show" : "hide";
}

/** Orca `effectiveBuiltInWorktreeSourceVisibility`: repo override → global pref → hide. */
export function effectiveBuiltInWorktreeSourceVisibility(
  repo: WorktreeVisibilityRepoConfig | null | undefined,
  id: BuiltInWorktreeVisibilitySourceId,
  defaults?: WorktreeVisibilityDefaults
): ExternalWorktreeVisibility {
  const explicit = repoPreferences(repo)?.builtIn?.[id];
  if (explicit) return explicit;
  return normalizeWorktreeVisibilitySourcePreferences(defaults?.sourcePreferences)?.builtIn?.[id] ?? "hide";
}

/**
 * Orca `effectiveCustomWorktreeSourceVisibility`: repo preference → `hide` when the repo
 * owns the source → global preference → hide (custom sources are never auto-shown).
 */
export function effectiveCustomWorktreeSourceVisibility(
  repo: WorktreeVisibilityRepoConfig | null | undefined,
  id: string,
  defaults?: WorktreeVisibilityDefaults
): ExternalWorktreeVisibility {
  const explicit = repoPreferences(repo)?.custom?.[id];
  if (explicit) return explicit;
  if ((repoCustomSources(repo) ?? []).some((source) => source.id === id)) return "hide";
  return normalizeWorktreeVisibilitySourcePreferences(defaults?.sourcePreferences)?.custom?.[id] ?? "hide";
}

/** Visibility the dialog paints on a row (`sourceVisibility` in Orca's source list). */
export function worktreeVisibilitySourceRowVisibility(
  repo: WorktreeVisibilityRepoConfig | null | undefined,
  row: WorktreeVisibilitySourceRow,
  defaults?: WorktreeVisibilityDefaults
): ExternalWorktreeVisibility {
  if (row.kind === "built-in") {
    return effectiveBuiltInWorktreeSourceVisibility(repo, row.id, defaults);
  }
  if (row.kind === "custom") {
    return effectiveCustomWorktreeSourceVisibility(repo, row.source.id, defaults);
  }
  return effectiveExternalWorktreeVisibility(repo, defaults);
}

/** Orca `buildWorktreeSourcePreferenceUpdate`: merge one source into the repo prefs. */
export function buildWorktreeSourcePreferenceUpdate(
  repo: WorktreeVisibilityRepoConfig | null | undefined,
  source: WorktreeVisibilitySourceMatch,
  visibility: ExternalWorktreeVisibility
): WorktreeVisibilitySourcePreferences {
  const current = repoPreferences(repo);
  const builtIn = { ...current?.builtIn };
  const custom = { ...current?.custom };
  if (source.kind === "built-in") {
    builtIn[source.id] = visibility;
  } else {
    custom[source.id] = visibility;
  }
  return {
    ...(Object.keys(builtIn).length > 0 ? { builtIn } : {}),
    ...(Object.keys(custom).length > 0 ? { custom } : {}),
  } as WorktreeVisibilitySourcePreferences;
}

/** Global value a row falls back to before the repo override (`globalWorktreeVisibilitySourceValue`). */
export function globalWorktreeVisibilitySourceValue(
  row: WorktreeVisibilitySourceRow,
  defaults?: WorktreeVisibilityDefaults
): ExternalWorktreeVisibility {
  if (row.kind === "built-in") {
    return normalizeWorktreeVisibilitySourcePreferences(defaults?.sourcePreferences)?.builtIn?.[row.id] ?? "hide";
  }
  if (row.kind === "custom") {
    return normalizeWorktreeVisibilitySourcePreferences(defaults?.sourcePreferences)?.custom?.[row.source.id] ?? "hide";
  }
  return defaults?.external ?? "hide";
}

export type AddCustomWorktreeSourceResult =
  | { ok: true; sources: CustomWorktreeVisibilitySource[] }
  | { ok: false; reason: "limit" | "invalid-path" | "duplicate-path" };

/** Orca `handleAddSource` validation, minus the id generation (caller supplies `id`). */
export function addCustomWorktreeVisibilitySource(
  repo: WorktreeVisibilityRepoConfig | null | undefined,
  defaults: WorktreeVisibilityDefaults | undefined,
  id: string,
  rootPath: string
): AddCustomWorktreeSourceResult {
  const existing = resolveCustomWorktreeVisibilitySources(repo, defaults);
  if (existing.length >= MAX_CUSTOM_WORKTREE_VISIBILITY_SOURCES) {
    return { ok: false, reason: "limit" };
  }
  const candidate = normalizeCustomWorktreeVisibilitySources([{ id, rootPath }])?.[0];
  if (!candidate) return { ok: false, reason: "invalid-path" };
  const next = normalizeCustomWorktreeVisibilitySources([...existing, candidate]);
  if (!next || next.length !== existing.length + 1) return { ok: false, reason: "duplicate-path" };
  return { ok: true, sources: next };
}

/** Orca `removeCustomWorktreeVisibilitySource` list half. */
export function removeCustomWorktreeVisibilitySource(
  existing: readonly CustomWorktreeVisibilitySource[],
  sourceId: string
): CustomWorktreeVisibilitySource[] {
  return existing.filter((source) => source.id !== sourceId);
}

/** Orca `removeCustomWorktreeSourcePreference`. */
export function removeCustomWorktreeSourcePreference(
  repo: WorktreeVisibilityRepoConfig | null | undefined,
  sourceId: string
): WorktreeVisibilitySourcePreferences {
  const current = repoPreferences(repo);
  const custom = { ...current?.custom };
  delete custom[sourceId];
  return {
    ...(current?.builtIn && Object.keys(current.builtIn).length > 0 ? { builtIn: current.builtIn } : {}),
    ...(Object.keys(custom).length > 0 ? { custom } : {}),
  } as WorktreeVisibilitySourcePreferences;
}

// ─── Source classification + counts ─────────────────────────────────────────

/** Orca `createWorktreeVisibilitySourceMatcher`, local-repo only (no worktree base paths). */
export function classifyWorktreeVisibilitySource(
  worktreePath: string,
  repoPath: string | null | undefined,
  customSources: readonly CustomWorktreeVisibilitySource[]
): WorktreeVisibilitySourceMatch | null {
  const normalizedWorktree = normalizeRuntimePathForComparison(worktreePath);
  // Orca matches built-in roots before custom ones; order decides the badge when overlap.
  if (repoPath) {
    const normalizedRepo = normalizeRuntimePathForComparison(repoPath.replace(/[\\/]+$/, ""));
    for (const builtIn of BUILT_IN_WORKTREE_VISIBILITY_SOURCES) {
      const root = `${normalizeRuntimePathForComparison(
        [normalizedRepo, ...builtIn.relativeRootSegments].join("/")
      )}/`;
      if (normalizedWorktree.startsWith(root)) {
        return { kind: "built-in", id: builtIn.id };
      }
    }
  }
  for (const source of customSources) {
    const root = `${normalizeRuntimePathForComparison(source.rootPath.replace(/[\\/]+$/, ""))}/`;
    if (normalizedWorktree.startsWith(root)) {
      return { kind: "custom", id: source.id };
    }
  }
  return null;
}

export function worktreeVisibilitySourceRowKey(row: WorktreeVisibilitySourceRow): string {
  if (row.kind === "built-in") return `built-in:${row.id}`;
  if (row.kind === "custom") return `custom:${row.source.id}`;
  return "other";
}

/** Counts hidden worktrees per row key (`N found` badges). */
export function countWorktreesByVisibilitySource(
  worktrees: readonly { path: string }[],
  repoPath: string | null | undefined,
  customSources: readonly CustomWorktreeVisibilitySource[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const worktree of worktrees) {
    const match = classifyWorktreeVisibilitySource(worktree.path, repoPath, customSources);
    const key = match ? `${match.kind}:${match.id}` : "other";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Rows the dialog renders, in Orca's order: built-ins, custom roots, `other` last. */
export function buildWorktreeVisibilitySourceRows(
  customSources: readonly CustomWorktreeVisibilitySource[]
): WorktreeVisibilitySourceRow[] {
  return [
    ...BUILT_IN_WORKTREE_VISIBILITY_SOURCES.map(
      (source) => ({ kind: "built-in", id: source.id }) as WorktreeVisibilitySourceRow
    ),
    ...customSources.map(
      (source) => ({ kind: "custom", source }) as WorktreeVisibilitySourceRow
    ),
    { kind: "other" },
  ];
}

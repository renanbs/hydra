/**
 * Tipos do envelope `catalog_get` (espelho TS do `CatalogEnvelope` Rust).
 * Campos em camelCase como serializados pelo serde.
 */
export interface CatalogProjectGroup {
  id: string;
  name: string;
  parentPath: string | null;
  connectionId?: string | null;
  executionHostId?: string | null;
  parentGroupId: string | null;
  createdFrom: string;
  tabOrder: number;
  isCollapsed: boolean;
  color: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CatalogFolderWorkspace {
  id: string;
  projectGroupId: string;
  name: string;
  folderPath: string;
  connectionId?: string | null;
  executionHostId?: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface CatalogRepo {
  id: string;
  path: string;
  displayName: string;
  addedAt: number;
  kind?: string | null;
  worktreeBasePath?: string | null;
  projectGroupId?: string | null;
  repoIcon?: unknown | null;
  importedExternalWorktreePaths?: string[];
  externalWorktreeDiscoverySuppressedAt?: number | null;
  /** Paths acknowledged with the inbox `Keep hidden` action (no longer offered). */
  externalWorktreeInboxBaselinePaths?: string[];
  /** Epoch ms the initial external-worktree visibility prompt completed; the
   *  discovered-worktree inbox only opens once this is a number. */
  externalWorktreeVisibilityPromptDismissedAt?: number | null;
  /** Project-level override for "other locations" (Orca `externalWorktreeVisibility`). */
  externalWorktreeVisibility?: "show" | "hide" | null;
  /** Legacy repos keep the pre-rollout "show" default (Orca
   *  `externalWorktreeVisibilityLegacy`). */
  externalWorktreeVisibilityLegacy?: boolean | null;
  /** Extra worktree roots the project recognizes (Orca
   *  `customWorktreeVisibilitySources`). */
  customWorktreeVisibilitySources?: Array<{ id: string; rootPath: string }> | null;
  /** Per-source Show/Hide pinned on the project (Orca
   *  `worktreeVisibilitySourcePreferences`). */
  worktreeVisibilitySourcePreferences?: {
    builtIn?: Partial<Record<"claude" | "gsd", "show" | "hide">>;
    custom?: Record<string, "show" | "hide">;
  } | null;
}

export interface CatalogEnvelope {
  schemaVersion: number;
  projectGroups: CatalogProjectGroup[];
  folderWorkspaces: CatalogFolderWorkspace[];
  repos: CatalogRepo[];
}

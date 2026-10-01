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
}

export interface CatalogEnvelope {
  schemaVersion: number;
  projectGroups: CatalogProjectGroup[];
  folderWorkspaces: CatalogFolderWorkspace[];
  repos: CatalogRepo[];
}

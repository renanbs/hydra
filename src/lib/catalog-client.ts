// Catalog write IPC. The catalog file is Rust-owned (`catalog.rs`: one atomic
// tmp+rename writer), so every mutation the renderer makes goes through a Tauri
// command that answers with the persisted envelope.
import { invoke } from "@tauri-apps/api/core";
import type { RepoIcon } from "../shared/repo-icon";
import type { CatalogEnvelope, NestedRepoImportResult } from "./catalog-types";

/**
 * Sidebar project ids are the catalog repo id behind the `repo_` prefix
 * (`catalogToSidebarModel`), while `catalog_set_repo_icon` addresses the catalog
 * row. Repos without the prefix are already catalog ids.
 */
export function catalogRepoIdFromProjectId(projectId: string): string {
  return projectId.startsWith("repo_") ? projectId.slice("repo_".length) : projectId;
}

/**
 * Writes (or clears, with `null`) the glyph `RepoIconGlyph` paints for a repo.
 * Returns the updated envelope so a caller can adopt the authoritative rows
 * without a second round trip.
 */
export function setCatalogRepoIcon(
  repoId: string,
  repoIcon: RepoIcon | null
): Promise<CatalogEnvelope> {
  return invoke<CatalogEnvelope>("catalog_set_repo_icon", { repoId, repoIcon });
}

/**
 * Registers a checkout that lives on another host (SSH). There is no local path
 * to probe, so the row carries the host stamps the sidebar scopes on; re-adding
 * the same `path` + `connectionId` returns the existing row.
 */
export function addRemoteCatalogRepo(args: {
  path: string;
  connectionId: string;
  executionHostId?: string;
  kind?: "git" | "folder";
  displayName?: string;
}): Promise<CatalogEnvelope> {
  return invoke<CatalogEnvelope>("catalog_add_remote_repo", {
    path: args.path,
    connectionId: args.connectionId,
    executionHostId: args.executionHostId ?? null,
    kind: args.kind ?? "git",
    displayName: args.displayName ?? null,
  });
}

/**
 * Registers a checkout that lives on a paired runtime server. Same row shape as
 * the SSH path; the `connectionId` carries `runtime:<environmentId>` so the
 * host-scoped removal keeps working, and `executionHostId` carries the full
 * `runtime:<id>` stamp the sidebar scopes on.
 */
export function addPairedServerCatalogRepo(args: {
  path: string;
  environmentId: string;
  kind?: "git" | "folder";
  displayName?: string;
}): Promise<CatalogEnvelope> {
  const connectionId = `runtime:${args.environmentId}`;
  return invoke<CatalogEnvelope>("catalog_add_remote_repo", {
    path: args.path,
    connectionId,
    executionHostId: `runtime:${encodeURIComponent(args.environmentId)}`,
    kind: args.kind ?? "git",
    displayName: args.displayName ?? null,
  });
}

/**
 * Drops a repo row. `connectionId` scopes the removal to one host, because two
 * hosts can hold the same absolute path.
 */
export function removeCatalogRepo(
  path: string,
  connectionId?: string
): Promise<CatalogEnvelope> {
  return invoke<CatalogEnvelope>("catalog_remove_repo", {
    path,
    connectionId: connectionId ?? null,
  });
}

export type AddCatalogFolderWorkspaceArgs = {
  parentPath: string;
  /** Existing group to open the folder under; omitted creates a `manual` one. */
  projectGroupId?: string | null;
  /** Defaults to `<folder> workspace` in the host. */
  name?: string | null;
  /** SSH target owning the folder, when it does not live on this machine. */
  connectionId?: string | null;
  executionHostId?: string | null;
};

/**
 * Creates a folder workspace (`catalogAddFolderWorkspace`). The host is
 * idempotent per `(group, folder path)`, so re-opening the same folder returns
 * the envelope unchanged instead of duplicating the row.
 */
export function addCatalogFolderWorkspace(
  args: AddCatalogFolderWorkspaceArgs
): Promise<CatalogEnvelope> {
  return invoke<CatalogEnvelope>("catalog_add_folder_workspace", {
    parentPath: args.parentPath,
    projectGroupId: args.projectGroupId ?? null,
    name: args.name ?? null,
    connectionId: args.connectionId ?? null,
    executionHostId: args.executionHostId ?? null,
  });
}

/**
 * Adds the repositories selected in the nested-import checklist in one catalog
 * write (`import_nested_repos`). `groupName` creates a group and assigns every
 * added repo to it; omit it for a separate import. A single invalid path rejects
 * the whole batch host-side, so `added` is all-or-nothing.
 */
export function importNestedCatalogRepos(
  paths: readonly string[],
  groupName?: string | null
): Promise<NestedRepoImportResult> {
  return invoke<NestedRepoImportResult>("import_nested_repos", {
    paths: [...paths],
    groupName: groupName?.trim() ? groupName.trim() : null,

  });
}

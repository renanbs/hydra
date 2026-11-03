// Catalog write IPC. The catalog file is Rust-owned (`catalog.rs`: one atomic
// tmp+rename writer), so every mutation the renderer makes goes through a Tauri
// command that answers with the persisted envelope.
import { invoke } from "@tauri-apps/api/core";
import type { RepoIcon } from "../shared/repo-icon";
import type { CatalogEnvelope } from "./catalog-types";

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

import type { CatalogEnvelope, CatalogProjectGroup, CatalogRepo } from "./catalog-types";
import type { HydraProject } from "../components/sidebar/types";

/**
 * Converte o envelope do catálogo para o modelo que a sidebar atual consome.
 * Bridge T-B1 (Jev wiring:bridge): App.tsx chama `catalog_get` e alimenta
 * `projects`/`projectGroups`/`projectGroupMap` existentes sem reescrever o store.
 *
 * - `Repo{kind:git}` vira `HydraProject{is_git:true}`.
 * - `Repo{kind:folder}` ou sem kind vira `HydraProject{is_git:false}`.
 * - `projectGroupId` do repo vira entrada em `projectGroupMap`.
 * - Grupos completos do Orca viram `{id,name}` simplificado da sidebar atual.
 */
export function catalogToSidebarModel(envelope: CatalogEnvelope): {
  projects: HydraProject[];
  projectGroups: Array<{ id: string; name: string }>;
  projectGroupMap: Record<string, string>;
  folderWorkspaces: Array<{ id: string; projectGroupId: string; name: string; folderPath: string }>;
} {
  const projectGroups = (envelope.projectGroups ?? []).map((g: CatalogProjectGroup) => ({
    id: g.id,
    name: g.name,
  }));
  const projectGroupMap: Record<string, string> = {};
  const projects: HydraProject[] = (envelope.repos ?? []).map((r: CatalogRepo) => {
    const id = `repo_${r.id}`;
    if (r.projectGroupId) projectGroupMap[id] = r.projectGroupId;
    return {
      id,
      name: r.displayName ?? r.path,
      path: r.path,
      is_git: (r.kind ?? "git") === "git",
      current_branch: "main",
      worktree_base_path: r.worktreeBasePath ?? null,
      imported_worktrees: r.importedExternalWorktreePaths,
      suppressed_discovery:
        r.externalWorktreeDiscoverySuppressedAt != null ? true : undefined,
      externalWorktreeInboxBaselinePaths: r.externalWorktreeInboxBaselinePaths,
      externalWorktreeVisibilityPromptDismissedAt:
        r.externalWorktreeVisibilityPromptDismissedAt ?? null,
      repo_icon: (r.repoIcon as HydraProject["repo_icon"]) ?? null,
    };
  });
  const folderWorkspaces = (envelope.folderWorkspaces ?? []).map((w) => ({
    id: w.id,
    projectGroupId: w.projectGroupId,
    name: w.name,
    folderPath: w.folderPath,
  }));
  return { projects, projectGroups, projectGroupMap, folderWorkspaces };
}

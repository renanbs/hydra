import type { CatalogEnvelope, CatalogProjectGroup, CatalogRepo } from "./catalog-types";
import type { HydraProject } from "../components/sidebar/types";
import { normalizeExecutionHostId, toSshExecutionHostId } from "../shared/execution-host";

/**
 * Converte o envelope do catálogo para o modelo que a sidebar atual consome.
 * Bridge T-B1 (Jev wiring:bridge): App.tsx chama `catalog_get` e alimenta
 * `projects`/`projectGroups`/`projectGroupMap` existentes sem reescrever o store.
 *
 * - `Repo{kind:git}` vira `HydraProject{is_git:true}`.
 * - `Repo{kind:folder}` ou sem kind vira `HydraProject{is_git:false}`.
 * - `projectGroupId` do repo vira entrada em `projectGroupMap`.
 * - Grupos completos do Orca viram a projeção `{id,name,tabOrder,hostId}` da sidebar.
 * - `hostId` é o stamp do host dono do grupo (D03a-021/082/087); sem stamp = local.
 */
function catalogGroupHostId(group: CatalogProjectGroup): string | undefined {
  const executionHostId = normalizeExecutionHostId(group.executionHostId);
  if (executionHostId) return executionHostId;
  const connectionId = group.connectionId?.trim();
  return connectionId ? toSshExecutionHostId(connectionId) : undefined;
}

export function catalogToSidebarModel(envelope: CatalogEnvelope): {
  projects: HydraProject[];
  projectGroups: Array<{ id: string; name: string; tabOrder?: number; hostId?: string }>;
  projectGroupMap: Record<string, string>;
  folderWorkspaces: Array<{
    id: string;
    projectGroupId: string;
    name: string;
    folderPath: string;
    connectionId?: string | null;
    executionHostId?: string | null;
  }>;
} {
  const projectGroups = (envelope.projectGroups ?? []).map((g: CatalogProjectGroup) => {
    const hostId = catalogGroupHostId(g);
    return { id: g.id, name: g.name, tabOrder: g.tabOrder, ...(hostId ? { hostId } : {}) };
  });
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
      externalWorktreeVisibility: r.externalWorktreeVisibility ?? null,
      externalWorktreeVisibilityLegacy: r.externalWorktreeVisibilityLegacy ?? null,
      agentWorktreeVisibility: r.agentWorktreeVisibility ?? null,
      externalWorktreeDiscoverySuppressedAt: r.externalWorktreeDiscoverySuppressedAt ?? null,
      customWorktreeVisibilitySources: r.customWorktreeVisibilitySources ?? null,
      worktreeVisibilitySourcePreferences: r.worktreeVisibilitySourcePreferences ?? null,
      repo_icon: (r.repoIcon as HydraProject["repo_icon"]) ?? null,
      // Host stamps must survive the bridge or the row host scope reads a remote
      // repo as local (D03a-046).
      connectionId: r.connectionId ?? null,
      executionHostId:
        (r.executionHostId as HydraProject["executionHostId"]) ?? null,
    };
  });
  const folderWorkspaces = (envelope.folderWorkspaces ?? []).map((w) => ({
    id: w.id,
    projectGroupId: w.projectGroupId,
    name: w.name,
    folderPath: w.folderPath,
    // Host stamps must survive the bridge: a folder on another machine must not
    // read this client's path probe (D03a-057).
    connectionId: w.connectionId ?? null,
    executionHostId: w.executionHostId ?? null,
  }));
  return { projects, projectGroups, projectGroupMap, folderWorkspaces };
}

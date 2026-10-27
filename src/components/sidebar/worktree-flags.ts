/**
 * D07 G7 — persistência de pin/unread por worktree.
 *
 * O SQLite (`worktree_metadata.is_pinned`/`is_unread`) é a fonte de verdade; o
 * payload de `scan_worktrees` (`GitWorktreeInfo`) entrega os dois campos em
 * snake_case e os omite quando a linha nunca gravou o valor. Este módulo isola
 * (a) a leitura/hidratação dos Sets e (b) o toggle otimista com rollback, para
 * que ambos sejam testáveis sem montar a árvore do App.
 */

/** Comando Tauri que grava as flags (args camelCase — convenção do repo). */
export const SET_WORKTREE_FLAGS_COMMAND = "set_worktree_flags";

export type WorktreeFlagField = "is_pinned" | "is_unread";

const INVOKE_ARG_BY_FIELD: Record<WorktreeFlagField, "isPinned" | "isUnread"> = {
  is_pinned: "isPinned",
  is_unread: "isUnread",
};

/** Recorte do payload do scan que carrega as flags persistidas. */
export interface WorktreeFlagPayload {
  path: string;
  is_pinned?: boolean | null;
  is_unread?: boolean | null;
}

export interface ProjectFlagTarget {
  id: string;
  path: string;
}

export type SetMembership = (updater: (previous: Set<string>) => Set<string>) => void;

export type InvokeCommand = <T>(command: string, args: Record<string, unknown>) => Promise<T>;

/**
 * `true`/`false` quando o banco gravou o valor; `undefined` quando a linha nunca
 * tocou a flag (campo ausente/null). A distinção importa: só um `false` explícito
 * remove do Set — ausência preserva o que veio das prefs (pins anteriores a esta
 * feature, ou keys locais sem linha no banco, como ids de sessão).
 */
export function worktreeFlagState(
  worktree: WorktreeFlagPayload,
  field: WorktreeFlagField
): boolean | undefined {
  const value = worktree[field];
  return typeof value === "boolean" ? value : undefined;
}

export function setWorktreeFlagMembership(
  previous: ReadonlySet<string>,
  path: string,
  flagged: boolean
): Set<string> {
  const next = new Set(previous);
  if (flagged) next.add(path);
  else next.delete(path);
  return next;
}

/** Reconcilia o Set por path de worktree com o payload do scan. */
export function reconcileWorktreeFlagSet(
  previous: ReadonlySet<string>,
  worktrees: readonly WorktreeFlagPayload[],
  field: WorktreeFlagField
): Set<string> {
  const next = new Set(previous);
  for (const worktree of worktrees) {
    const state = worktreeFlagState(worktree, field);
    if (state === undefined) continue;
    if (state) next.add(worktree.path);
    else next.delete(worktree.path);
  }
  return next;
}

/**
 * Reconcilia o Set por id de projeto a partir da main worktree (path do projeto):
 * é o único elo entre as flags do banco (keyed por path) e o pin/unread que a
 * linha de projeto consome (`pinnedProjects`/`unreadProjects`).
 */
export function reconcileProjectFlagSet(
  previous: ReadonlySet<string>,
  worktrees: readonly WorktreeFlagPayload[],
  projects: readonly ProjectFlagTarget[],
  field: WorktreeFlagField
): Set<string> {
  const next = new Set(previous);
  const projectIdByPath = new Map(projects.map((project) => [project.path, project.id]));
  for (const worktree of worktrees) {
    const projectId = projectIdByPath.get(worktree.path);
    if (projectId === undefined) continue;
    const state = worktreeFlagState(worktree, field);
    if (state === undefined) continue;
    if (state) next.add(projectId);
    else next.delete(projectId);
  }
  return next;
}

export interface WorktreeFlagApplierDeps {
  field: WorktreeFlagField;
  setWorktreeFlagged: SetMembership;
  /** Espelha o mesmo toggle na linha de projeto quando o path é o da main worktree. */
  setProjectFlagged?: SetMembership;
  findProjectIdByPath?: (path: string) => string | undefined;
  invoke: InvokeCommand;
}

/**
 * Toggle otimista: aplica o novo membership imediatamente, grava via `invoke` e
 * reverte se o comando falhar. Só envia a flag alterada — o backend preserva a
 * outra (`None`) e os demais campos da linha (`display_name`/`status`/...).
 */
export function createWorktreeFlagApplier(
  deps: WorktreeFlagApplierDeps
): (path: string, currentlyFlagged: boolean) => Promise<void> {
  const argKey = INVOKE_ARG_BY_FIELD[deps.field];
  return async (path: string, currentlyFlagged: boolean): Promise<void> => {
    const next = !currentlyFlagged;
    const projectId = deps.findProjectIdByPath?.(path);
    const mutate = (flagged: boolean): void => {
      deps.setWorktreeFlagged((previous) => setWorktreeFlagMembership(previous, path, flagged));
      if (projectId !== undefined && deps.setProjectFlagged) {
        deps.setProjectFlagged((previous) =>
          setWorktreeFlagMembership(previous, projectId, flagged)
        );
      }
    };
    mutate(next);
    try {
      await deps.invoke(SET_WORKTREE_FLAGS_COMMAND, { worktreePath: path, [argKey]: next });
    } catch {
      mutate(currentlyFlagged);
    }
  };
}

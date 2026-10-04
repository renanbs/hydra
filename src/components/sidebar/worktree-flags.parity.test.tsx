// D07 G7 — pin/unread persistidos. O toggle grava via `set_worktree_flags`
// (otimista, com rollback em falha) e os Sets são hidratados do MESMO payload de
// `scan_worktrees` que já hidrata os metadados do worktree (`GitWorktreeInfo`:
// `is_pinned`/`is_unread`), então o card/linha pinta o estado persistido já no
// primeiro paint — sem fetch novo.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { useAppStore } from "@/store";
import { WorktreeList, type WorktreeListProps } from "./WorktreeList";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import type { GitWorktreeInfo, HydraProject } from "./types";
import {
  createWorktreeFlagApplier,
  reconcileProjectFlagSet,
  reconcileWorktreeFlagSet,
  type WorktreeFlagPayload,
} from "./worktree-flags";

const PROJECT: HydraProject = {
  id: "repo_hydra",
  name: "hydra",
  path: "/repo/hydra",
  is_git: true,
  current_branch: "main",
};

const BASE_DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: "repo",
  sortBy: "name",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
};

const BASE_STORE_STATE = {
  repos: [],
  sshTargetLabels: new Map(),
  sshConnectionStates: new Map(),
  runtimeEnvironments: [],
  settings: null,
  visibleWorkspaceHostIds: [],
  workspaceHostScope: null,
  worktreeLineageById: {},
};

function resetStore() {
  useAppStore.setState(BASE_STORE_STATE);
}

function worktree(path: string, branch: string, isMain = false): GitWorktreeInfo {
  return {
    id: path,
    path,
    head_commit: "abc1234",
    branch,
    is_bare: false,
    is_locked: false,
    is_main: isMain,
  };
}

function renderList(
  props: Partial<WorktreeListProps> & {
    projects: HydraProject[];
    worktreesByProject: Record<string, GitWorktreeInfo[]>;
  }
) {
  const { projects, worktreesByProject, ...rest } = props;
  return render(
    <WorktreeList
      projects={projects}
      displayProjects={projects}
      activeProject={projects[0] ?? null}
      sessions={[]}
      collapsedProjects={new Set()}
      collapsedGroups={new Set()}
      displayOptions={BASE_DISPLAY_OPTIONS}
      getFilteredAndSortedWorktrees={(proj) => worktreesByProject[proj.path] ?? []}
      onSelectProject={() => {}}
      onSelectGitWorktree={() => {}}
      onDeleteGitWorktree={() => {}}
      onSelectSession={() => {}}
      onOpenNewWorkspaceModal={() => {}}
      onOpenAddRepoDialog={() => {}}
      onToggleProjectCollapse={() => {}}
      onToggleGroupCollapse={() => {}}
      {...rest}
    />
  );
}

function createSetHarness(initial: string[] = []) {
  const state = { current: new Set(initial) };
  const set = (updater: (previous: Set<string>) => Set<string>) => {
    state.current = updater(state.current);
  };
  return { state, set };
}

function createInvokeSpy(rejects = false) {
  const calls: Array<{ command: string; args: Record<string, unknown> }> = [];
  const invoke = <T,>(command: string, args: Record<string, unknown>): Promise<T> => {
    calls.push({ command, args });
    return rejects ? Promise.reject(new Error("invoke failed")) : Promise.resolve(undefined as T);
  };
  return { calls, invoke };
}

describe("worktree flags — toggle persistido (D07 G7)", () => {
  it("grava o path e a flag no comando e espelha a main worktree no projeto", async () => {
    const worktrees = createSetHarness();
    const projects = createSetHarness();
    const spy = createInvokeSpy();
    const apply = createWorktreeFlagApplier({
      field: "is_pinned",
      setWorktreeFlagged: worktrees.set,
      setProjectFlagged: projects.set,
      findProjectIdByPath: (path) => (path === PROJECT.path ? PROJECT.id : undefined),
      invoke: spy.invoke,
    });

    await apply(PROJECT.path, false);

    expect(spy.calls).toEqual([
      {
        command: "set_worktree_flags",
        args: { worktreePath: PROJECT.path, isPinned: true },
      },
    ]);
    expect([...worktrees.state.current]).toEqual([PROJECT.path]);
    expect([...projects.state.current]).toEqual([PROJECT.id]);
  });

  it("envia só a flag alterada (unread preserva o pin no backend)", async () => {
    const worktrees = createSetHarness();
    const spy = createInvokeSpy();
    const apply = createWorktreeFlagApplier({
      field: "is_unread",
      setWorktreeFlagged: worktrees.set,
      invoke: spy.invoke,
    });

    await apply("/repo/hydra", false);

    expect(spy.calls).toEqual([
      {
        command: "set_worktree_flags",
        args: { worktreePath: "/repo/hydra", isUnread: true },
      },
    ]);
    expect(Object.keys(spy.calls[0].args)).not.toContain("isPinned");
    expect([...worktrees.state.current]).toEqual(["/repo/hydra"]);
  });

  it("desmarcar envia isPinned=false e remove do Set", async () => {
    const worktrees = createSetHarness(["/repo/hydra"]);
    const spy = createInvokeSpy();
    const apply = createWorktreeFlagApplier({
      field: "is_pinned",
      setWorktreeFlagged: worktrees.set,
      invoke: spy.invoke,
    });

    await apply("/repo/hydra", true);

    expect(spy.calls[0].args).toEqual({ worktreePath: "/repo/hydra", isPinned: false });
    expect([...worktrees.state.current]).toEqual([]);
  });

  it("reverte o estado otimista quando o invoke falha", async () => {
    const adding = createSetHarness();
    const spy = createInvokeSpy(true);
    const apply = createWorktreeFlagApplier({
      field: "is_pinned",
      setWorktreeFlagged: adding.set,
      invoke: spy.invoke,
    });

    await apply("/repo/hydra", false);
    expect([...adding.state.current]).toEqual([]);

    const removing = createSetHarness(["/repo/hydra"]);
    const applyRemoval = createWorktreeFlagApplier({
      field: "is_pinned",
      setWorktreeFlagged: removing.set,
      invoke: spy.invoke,
    });

    await applyRemoval("/repo/hydra", true);
    expect([...removing.state.current]).toEqual(["/repo/hydra"]);
  });
});

describe("worktree flags — hidratação do payload do scan", () => {
  it("popula o Set por path: true marca, false limpa, ausente preserva", () => {
    const payload: WorktreeFlagPayload[] = [
      { path: "/a", is_pinned: true },
      { path: "/b", is_pinned: false },
      { path: "/c" },
    ];

    const hydrated = reconcileWorktreeFlagSet(new Set(["/legacy", "/b", "/c"]), payload, "is_pinned");

    expect(hydrated.has("/a")).toBe(true);
    expect(hydrated.has("/b")).toBe(false);
    // Campo ausente = nunca gravado no banco: não mexe no que veio das prefs.
    expect(hydrated.has("/c")).toBe(true);
    expect(hydrated.has("/legacy")).toBe(true);
  });

  it("mapeia a main worktree (path === project.path) para o id do projeto", () => {
    const payload: WorktreeFlagPayload[] = [
      { path: PROJECT.path, is_unread: true },
      { path: "/repo/other", is_unread: true, is_pinned: true },
    ];
    const targets = [{ id: PROJECT.id, path: PROJECT.path }];

    const unreadProjects = reconcileProjectFlagSet(new Set(), payload, targets, "is_unread");
    expect([...unreadProjects]).toEqual([PROJECT.id]);

    const pinnedProjects = reconcileProjectFlagSet(new Set(), payload, targets, "is_pinned");
    expect([...pinnedProjects]).toEqual([]);
  });
});

describe("worktree flags — primeiro paint do card/linha", () => {
  beforeEach(() => resetStore());
  afterEach(() => resetStore());

  it("renderiza a seção Pinned a partir do Set hidratado do payload", () => {
    const pinnedPath = "/repo/hydra-pinned";
    const payload: WorktreeFlagPayload[] = [
      { path: pinnedPath, is_pinned: true },
      { path: PROJECT.path, is_pinned: false },
    ];
    const pinnedWorktrees = reconcileWorktreeFlagSet(new Set<string>(), payload, "is_pinned");

    const { container } = renderList({
      projects: [PROJECT],
      worktreesByProject: {
        [PROJECT.path]: [worktree(PROJECT.path, "main", true), worktree(pinnedPath, "feat/x")],
      },
      pinnedWorktrees,
    });

    const orderedHeaders = container.querySelectorAll(
      "[data-section-header-id],[data-repo-header-id]"
    );
    expect(orderedHeaders[0]?.getAttribute("data-section-header-id")).toBe("pinned");
    expect(container.querySelectorAll("[data-worktree-card-surface]")).toHaveLength(2);
  });

  it("aplica a ênfase de não-lido no título a partir do Set hidratado", () => {
    const unreadPath = "/repo/hydra-unread";
    const payload: WorktreeFlagPayload[] = [{ path: unreadPath, is_unread: true }];
    const unreadWorktrees = reconcileWorktreeFlagSet(new Set<string>(), payload, "is_unread");

    const { container } = renderList({
      projects: [PROJECT],
      worktreesByProject: {
        [PROJECT.path]: [worktree(unreadPath, "feat/unread")],
      },
      unreadWorktrees,
    });

    const card = container.querySelector(`[data-worktree-path="${unreadPath}"]`);
    expect(card).not.toBeNull();
    const titleSpans = Array.from(card!.querySelectorAll("span")).filter(
      (el) => el.textContent === "feat/unread"
    );
    expect(titleSpans.some((el) => el.className.includes("font-medium"))).toBe(true);
  });
});

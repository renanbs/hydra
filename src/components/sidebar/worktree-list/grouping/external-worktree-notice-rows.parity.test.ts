// D03a-033/D03a-034: the discovered-worktree notice rows keep their placement
// contract — pinned fallback outside repo grouping, a repo section under the Pinned
// single-location policy, and host context when one project spans hosts.
import { describe, expect, it } from "vitest";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import type { Repo } from "../../../../shared/repo-types";
import type { Worktree } from "../../../../shared/worktree/types";
import type { Project, ProjectHostSetup } from "../../../../shared/project-types";
import { buildRows } from "./build-rows";
import type {
  ImportedWorktreesCardRow,
  NewExternalWorktreesInboxRow,
  Row,
} from "./row-types";

const LOCAL = "local";
const SSH = "ssh:h1";

function repo(id: string, host?: string): Repo {
  return {
    id,
    path: `/repo/${id}`,
    displayName: id,
    badgeColor: "#64748b",
    addedAt: 0,
    projectGroupId: null,
    ...(host ? { executionHostId: host as never } : {}),
  } as Repo;
}

function worktree(repoId: string, path: string, branch: string, pinned = false): Worktree {
  return toWorktreeRow(
    { path, head_commit: "abc1234", branch, is_bare: false, is_main: false },
    { repoId, hostId: LOCAL, isPinned: pinned }
  );
}

function imported(repoRow: Repo, path: string) {
  return { repo: repoRow, hiddenWorktrees: [{ path, head_commit: "abc", branch: "feat" }] };
}

function inbox(repoRow: Repo, path: string) {
  return { repo: repoRow, inboxWorktrees: [{ path, head_commit: "abc", branch: "feat" }] };
}

function build(args: {
  groupBy: "repo" | "workspace-status" | "none";
  worktrees: Worktree[];
  repoMap: Map<string, Repo>;
  imported?: Map<string, ReturnType<typeof imported>>;
  inbox?: Map<string, ReturnType<typeof inbox>>;
  projectGrouping?: { projects: Project[]; projectHostSetups: ProjectHostSetup[] };
}): Row[] {
  return buildRows(
    args.groupBy,
    args.worktrees,
    args.repoMap,
    null,
    new Set(),
    undefined,
    undefined,
    "manual",
    {},
    new Map(args.worktrees.map((worktree) => [worktree.id, worktree])),
    true,
    undefined,
    [],
    new Set(args.repoMap.keys()),
    args.imported ?? new Map(),
    args.inbox ?? new Map(),
    [],
    args.projectGrouping,
    [],
    new Map([
      [LOCAL, "This computer"],
      [SSH, "Build box"],
    ])
  );
}

describe("external worktree notice placement (D03a-033)", () => {
  it("places the imported card as the Pinned fallback outside repo grouping", () => {
    const repoA = repo("repo_a");
    const pinned = worktree("repo_a", "/repo/repo_a/pinned", "feat/pinned", true);
    const rows = build({
      groupBy: "workspace-status",
      worktrees: [pinned],
      repoMap: new Map([["repo_a", repoA]]),
      imported: new Map([["repo_a", imported(repoA, "/repo/repo_a/external")]]),
    });

    const card = rows.find(
      (row): row is ImportedWorktreesCardRow => row.type === "imported-worktrees-card"
    );
    expect(card?.placement).toBe("pinned-fallback");
  });

  it("labels a notice row when the project is checked out on more than one host", () => {
    const localRepo = repo("repo_local", LOCAL);
    const sshRepo = repo("repo_ssh", SSH);
    const project: Project = {
      id: "project_a",
      displayName: "Project A",
      badgeColor: "#64748b",
      sourceRepoIds: ["repo_local", "repo_ssh"],
      createdAt: 0,
      updatedAt: 0,
    };
    const setups: ProjectHostSetup[] = [localRepo, sshRepo].map((row, index) => ({
      id: `setup_${index}`,
      projectId: project.id,
      hostId: index === 0 ? LOCAL : SSH,
      repoId: row.id,
      path: row.path,
      displayName: row.displayName,
      setupState: "ready",
      setupMethod: "legacy-repo",
      createdAt: 0,
      updatedAt: 0,
    }));

    const rows = build({
      groupBy: "repo",
      worktrees: [],
      repoMap: new Map([
        [localRepo.id, localRepo],
        [sshRepo.id, sshRepo],
      ]),
      imported: new Map([
        [localRepo.id, imported(localRepo, "/repo/repo_local/external")],
        [sshRepo.id, imported(sshRepo, "/repo/repo_ssh/external")],
      ]),
      projectGrouping: { projects: [project], projectHostSetups: setups },
    });

    const cards = rows.filter(
      (row): row is ImportedWorktreesCardRow => row.type === "imported-worktrees-card"
    );
    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.hostContextLabel).sort()).toEqual([
      "Build box",
      "This computer",
    ]);
    expect(cards.map((card) => card.hostContextHostId).sort()).toEqual([LOCAL, SSH]);
  });
});

describe("external worktree inbox repo section (D03a-034)", () => {
  it("keeps the repo section when Pinned single-location removed its natural items", () => {
    const repoA = repo("repo_a");
    const pinned = worktree("repo_a", "/repo/repo_a/pinned", "feat/pinned", true);
    const rows = build({
      groupBy: "repo",
      worktrees: [pinned],
      repoMap: new Map([["repo_a", repoA]]),
      inbox: new Map([["repo_a", inbox(repoA, "/repo/repo_a/external")]]),
    });

    expect(rows.some((row) => row.type === "header" && row.key === "repo:repo_a")).toBe(true);
    const inboxRow = rows.find(
      (row): row is NewExternalWorktreesInboxRow =>
        row.type === "new-external-worktrees-inbox"
    );
    expect(inboxRow?.repo.id).toBe("repo_a");
    // The natural item moved into Pinned under the default policy.
    expect(
      rows.some((row) => row.type === "item" && row.sectionKey === "repo:repo_a")
    ).toBe(false);
  });

  it("keeps pinned items in their repo section under duplicate-in-groups", () => {
    const repoA = repo("repo_a");
    const pinned = worktree("repo_a", "/repo/repo_a/pinned", "feat/pinned", true);
    const rows = buildRows(
      "repo",
      [pinned],
      new Map([["repo_a", repoA]]),
      null,
      new Set(),
      undefined,
      undefined,
      "manual",
      {},
      new Map([[pinned.id, pinned]]),
      true,
      {
        showPinnedWorktreesInGroups: true,
      } as never,
      [],
      new Set(["repo_a"]),
      new Map(),
      new Map([["repo_a", inbox(repoA, "/repo/repo_a/external")]]),
      []
    );

    expect(
      rows.some((row) => row.type === "item" && row.sectionKey === "repo:repo_a")
    ).toBe(true);
  });
});

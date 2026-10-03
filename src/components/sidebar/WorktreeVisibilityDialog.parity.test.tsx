// Parity guard for the `Non-Hydra worktrees` modal — Orca's
// `components/sidebar/WorktreeVisibilityDialog.tsx` carries four blocks: the `Sources`
// rows (Claude Code / GSD / Other locations) with Show/Hide toggles, a `Worktree root`
// add form, the global-settings override note, and the `Hidden worktrees (N)` recovery
// list. Source writes go through `catalog_set_worktree_visibility_sources` as a FULL
// REPLACE; per-item recovery goes through `import_worktree`.
import { describe, expect, it, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { GitWorktreeInfo, HydraProject } from "../types";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

import { WorktreeVisibilityDialog, type WorktreeVisibilityDialogProps } from "./WorktreeVisibilityDialog";

function worktree(path: string, branch: string): GitWorktreeInfo {
  return { path, branch, head_commit: "abc123", is_bare: false, is_locked: false };
}

const PROJECT: HydraProject = {
  id: "repo_1",
  name: "repo",
  path: "/home/me/src/repo",
  is_git: true,
  current_branch: "main",
  customWorktreeVisibilitySources: [{ id: "extra", rootPath: "/home/me/src/extra" }],
  externalWorktreeVisibilityLegacy: false,
};

const HIDDEN: GitWorktreeInfo[] = [
  worktree("/home/me/src/repo/.claude/worktrees/a", "agent/a"),
  worktree("/home/me/src/repo/.gsd-workspaces/b", "agent/b"),
  worktree("/home/me/src/extra/c", "feat/c"),
  worktree("/home/me/src/elsewhere/d", "fix/d"),
];

function renderDialog(overrides: Partial<WorktreeVisibilityDialogProps> = {}) {
  return render(
    <WorktreeVisibilityDialog
      open
      project={PROJECT}
      hiddenWorktrees={HIDDEN}
      visibilityDefaults={{ external: "hide" }}
      onOpenChange={vi.fn()}
      onImported={vi.fn()}
      onOpenGlobalSettings={vi.fn()}
      {...overrides}
    />
  );
}

function sourceToggle(region: HTMLElement, label: string, action: "Show" | "Hide") {
  return within(within(region).getByRole("group", { name: `Visibility for ${label}` })).getByRole(
    "button",
    { name: action }
  );
}

describe("WorktreeVisibilityDialog (Orca parity)", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({});
  });

  it("renders the four Orca blocks with their copy", () => {
    renderDialog();

    expect(screen.getByRole("heading", { name: "Non-Hydra worktrees" })).toBeInTheDocument();

    const sources = screen.getByRole("region", { name: "Sources" });
    expect(within(sources).getByText("Claude Code")).toBeInTheDocument();
    expect(within(sources).getByText(".claude/worktrees/*")).toBeInTheDocument();
    expect(within(sources).getByText("GSD")).toBeInTheDocument();
    expect(within(sources).getByText(".gsd-workspaces/*")).toBeInTheDocument();
    expect(within(sources).getByText("Other locations")).toBeInTheDocument();
    expect(within(sources).getByText("Outside listed sources")).toBeInTheDocument();
    // Badges classify each of the four hidden worktrees into its row.
    expect(within(sources).getAllByText("1 found")).toHaveLength(4);

    expect(screen.getByRole("heading", { name: "Worktree root" })).toBeInTheDocument();
    expect(screen.getByText("Hydra will recognize worktrees beneath this folder.")).toBeInTheDocument();

    expect(
      screen.getByText("These sources have a global setting you can override here:")
    ).toBeInTheDocument();

    const hidden = screen.getByRole("region", { name: "Hidden worktrees (4)" });
    expect(within(hidden).getByText("Show one without enabling its source.")).toBeInTheDocument();
    expect(within(hidden).getByText("feat/c")).toBeInTheDocument();
    expect(within(hidden).getByText("fix/d")).toBeInTheDocument();
  });

  it("writes a built-in Show/Hide as a full-replace source preference", () => {
    renderDialog();

    const sources = screen.getByRole("region", { name: "Sources" });
    fireEvent.click(sourceToggle(sources, "Claude Code", "Show"));

    expect(invokeMock).toHaveBeenCalledWith("catalog_set_worktree_visibility_sources", {
      repoPath: PROJECT.path,
      customSources: PROJECT.customWorktreeVisibilitySources,
      sourcePreferences: { builtIn: { claude: "show" } },
      externalWorktreeVisibilityLegacy: false,
      externalWorktreeVisibility: null,
      externalWorktreeDiscoverySuppressedAt: null,
    });
  });

  it("writes Other locations as the project-level external override", () => {
    renderDialog();

    const sources = screen.getByRole("region", { name: "Sources" });
    fireEvent.click(sourceToggle(sources, "Other locations", "Show"));

    expect(invokeMock).toHaveBeenCalledWith("catalog_set_worktree_visibility_sources", {
      repoPath: PROJECT.path,
      customSources: PROJECT.customWorktreeVisibilitySources,
      sourcePreferences: null,
      externalWorktreeVisibilityLegacy: false,
      externalWorktreeVisibility: "show",
      externalWorktreeDiscoverySuppressedAt: null,
    });
  });

  it("clears the discovery suppression when Other locations is shown", () => {
    renderDialog({
      project: { ...PROJECT, externalWorktreeDiscoverySuppressedAt: 1_700_000_000_000 },
    });

    const sources = screen.getByRole("region", { name: "Sources" });
    fireEvent.click(sourceToggle(sources, "Other locations", "Show"));

    expect(invokeMock).toHaveBeenCalledWith(
      "catalog_set_worktree_visibility_sources",
      expect.objectContaining({
        externalWorktreeVisibility: "show",
        externalWorktreeDiscoverySuppressedAt: null,
      })
    );
  });

  it("preserves an existing suppression timestamp on unrelated source writes", () => {
    renderDialog({
      project: { ...PROJECT, externalWorktreeDiscoverySuppressedAt: 1_700_000_000_000 },
    });

    const sources = screen.getByRole("region", { name: "Sources" });
    fireEvent.click(sourceToggle(sources, "Claude Code", "Show"));

    expect(invokeMock).toHaveBeenCalledWith(
      "catalog_set_worktree_visibility_sources",
      expect.objectContaining({
        externalWorktreeDiscoverySuppressedAt: 1_700_000_000_000,
      })
    );
  });

  it("reads the global default when the project has no override", () => {
    renderDialog({
      visibilityDefaults: { external: "hide", sourcePreferences: { builtIn: { gsd: "show" } } },
    });

    const sources = screen.getByRole("region", { name: "Sources" });
    expect(within(sources).getByRole("group", { name: "Visibility for GSD" })).toHaveTextContent(
      "Show"
    );
    expect(
      within(within(sources).getByRole("group", { name: "Visibility for GSD" })).getByRole(
        "button",
        { name: "Show" }
      )
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("adds a worktree root through the catalog command", () => {
    renderDialog();

    fireEvent.change(screen.getByPlaceholderText("/path/to/worktrees"), {
      target: { value: "/home/me/src/roots" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(invokeMock).toHaveBeenCalledWith(
      "catalog_set_worktree_visibility_sources",
      expect.objectContaining({
        repoPath: PROJECT.path,
        customSources: expect.arrayContaining([
          { id: "extra", rootPath: "/home/me/src/extra" },
          expect.objectContaining({ rootPath: "/home/me/src/roots" }),
        ]),
      })
    );
  });

  it("recovers one hidden worktree through import_worktree", async () => {
    const onImported = vi.fn();
    renderDialog({ onImported });

    // The recovery list renders in `hiddenWorktrees` order; the third row is the
    // custom-root worktree.
    const hidden = screen.getByRole("region", { name: "Hidden worktrees (4)" });
    fireEvent.click(within(hidden).getAllByRole("button", { name: "Show" })[2]);

    expect(invokeMock).toHaveBeenCalledWith("import_worktree", {
      projectPath: PROJECT.path,
      worktreePath: "/home/me/src/extra/c",
    });
    await waitFor(() =>
      expect(onImported).toHaveBeenCalledWith("/home/me/src/extra/c")
    );
  });

  it("points the override note at Global Settings", () => {
    const onOpenGlobalSettings = vi.fn();
    renderDialog({ onOpenGlobalSettings });

    fireEvent.click(screen.getByRole("button", { name: /Manage in Global Settings/ }));
    expect(onOpenGlobalSettings).toHaveBeenCalledTimes(1);
  });
});

// Parity guard for the `Non-Hydra worktrees` modal — Orca's
// `components/sidebar/WorktreeVisibilityDialog.tsx` stacks the `Sources` rows (Claude
// Code / GSD / Other locations) with Show/Hide toggles, the `Worktree root` add form, the
// global-settings override note, the scan-status/`Try again` line between that note and
// the `Hidden worktrees (N)` recovery list. A source whose repo override merely matches
// Global Settings exposes `Use global`, which drops that override. Source writes go
// through `catalog_set_worktree_visibility_sources` as a FULL REPLACE; the scan and
// per-item recovery go through `scan_worktrees` and `import_worktree`.
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
      agentWorktreeVisibility: null,
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
      agentWorktreeVisibility: null,
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

  it("offers Use global only for the override that matches the global value, and clears it", () => {
    renderDialog({
      project: {
        ...PROJECT,
        worktreeVisibilitySourcePreferences: { builtIn: { claude: "show" } },
      },
      visibilityDefaults: { external: "hide", sourcePreferences: { builtIn: { claude: "show" } } },
    });

    const sources = screen.getByRole("region", { name: "Sources" });
    // GSD and Other locations inherit the global value, so only Claude Code is revertible.
    expect(
      within(sources).queryByRole("button", { name: "Use global for GSD" })
    ).not.toBeInTheDocument();
    expect(
      within(sources).queryByRole("button", { name: "Use global for Other locations" })
    ).not.toBeInTheDocument();

    fireEvent.click(within(sources).getByRole("button", { name: "Use global for Claude Code" }));

    expect(invokeMock).toHaveBeenCalledWith("catalog_set_worktree_visibility_sources", {
      repoPath: PROJECT.path,
      customSources: PROJECT.customWorktreeVisibilitySources,
      sourcePreferences: {},
      externalWorktreeVisibilityLegacy: false,
      externalWorktreeVisibility: null,
      agentWorktreeVisibility: null,
      externalWorktreeDiscoverySuppressedAt: null,
    });
  });

  it("treats a repo-level agentWorktreeVisibility alone as a built-in override", () => {
    renderDialog({
      project: { ...PROJECT, agentWorktreeVisibility: "show" },
      visibilityDefaults: { external: "hide", sourcePreferences: { builtIn: { claude: "show" } } },
    });

    const sources = screen.getByRole("region", { name: "Sources" });
    // The policy drives the row even without a per-source preference…
    const claude = within(sources).getByRole("group", { name: "Visibility for Claude Code" });
    expect(within(claude).getByRole("button", { name: "Show" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    // …and because it matches Global Settings, Claude Code is revertible; GSD is not.
    expect(
      within(sources).queryByRole("button", { name: "Use global for GSD" })
    ).not.toBeInTheDocument();
    expect(
      within(sources).getByRole("button", { name: "Use global for Claude Code" })
    ).toBeInTheDocument();

    fireEvent.click(within(sources).getByRole("button", { name: "Use global for Claude Code" }));

    expect(invokeMock).toHaveBeenCalledWith("catalog_set_worktree_visibility_sources", {
      repoPath: PROJECT.path,
      customSources: PROJECT.customWorktreeVisibilitySources,
      sourcePreferences: {},
      externalWorktreeVisibilityLegacy: false,
      externalWorktreeVisibility: null,
      agentWorktreeVisibility: null,
      externalWorktreeDiscoverySuppressedAt: null,
    });
  });

  it("keeps Use global hidden when agentWorktreeVisibility disagrees with Global Settings", () => {
    renderDialog({
      project: { ...PROJECT, agentWorktreeVisibility: "hide" },
      visibilityDefaults: { external: "hide", sourcePreferences: { builtIn: { claude: "show" } } },
    });

    const sources = screen.getByRole("region", { name: "Sources" });
    const claude = within(sources).getByRole("group", { name: "Visibility for Claude Code" });
    // The agent policy wins over the global Show, so there is no matching override to drop.
    expect(within(claude).getByRole("button", { name: "Hide" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(
      within(sources).queryByRole("button", { name: "Use global for Claude Code" })
    ).not.toBeInTheDocument();
  });

  it("clears the Other locations override when Use global is picked", () => {
    renderDialog({
      project: { ...PROJECT, externalWorktreeVisibility: "show" },
      visibilityDefaults: { external: "show" },
    });

    const sources = screen.getByRole("region", { name: "Sources" });
    expect(
      within(sources).queryByRole("button", { name: "Use global for Claude Code" })
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(sources).getByRole("button", { name: "Use global for Other locations" })
    );

    expect(invokeMock).toHaveBeenCalledWith(
      "catalog_set_worktree_visibility_sources",
      expect.objectContaining({
        repoPath: PROJECT.path,
        sourcePreferences: null,
        externalWorktreeVisibility: null,
      })
    );
  });

  it("re-runs the repo scan once on Try again and shows the scan state", async () => {
    let scanCalls = 0;
    let failNext = true;
    const retryScan = Promise.withResolvers<unknown>();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd !== "scan_worktrees") return Promise.resolve({});
      scanCalls += 1;
      if (failNext) {
        failNext = false;
        return Promise.reject(new Error("scan failed"));
      }
      return retryScan.promise;
    });

    renderDialog();

    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not list this repo's worktrees."
    );

    const callsBeforeRetry = scanCalls;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Checking…")).toBeInTheDocument();
    expect(scanCalls).toBe(callsBeforeRetry + 1);

    retryScan.resolve({ visible: [], hidden: [], isSuppressed: false });
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("keeps the Orca block order: Sources → Global Settings → Scan status → Hidden worktrees", async () => {
    invokeMock.mockImplementation((cmd: string) =>
      cmd === "scan_worktrees" ? Promise.reject(new Error("scan failed")) : Promise.resolve({})
    );

    renderDialog();

    const sources = screen.getByRole("region", { name: "Sources" });
    const note = screen.getByText("These sources have a global setting you can override here:");
    const scanStatus = await screen.findByRole("region", { name: "Worktree scan status" });
    const hidden = screen.getByRole("region", { name: "Hidden worktrees (4)" });

    const precedes = (first: Element, second: Element) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(precedes(sources, note)).toBe(true);
    expect(precedes(note, scanStatus)).toBe(true);
    expect(precedes(scanStatus, hidden)).toBe(true);
  });
});

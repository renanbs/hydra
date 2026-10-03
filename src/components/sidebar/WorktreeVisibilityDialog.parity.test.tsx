// Parity guard for the `Non-Hydra worktrees` modal — Orca's
// `components/sidebar/WorktreeVisibilityDialog.tsx` stacks the `Sources` rows (Claude
// Code / GSD / Other locations) with Show/Hide toggles, the `Worktree root` add form, the
// global-settings override note, the scan-status/`Try again` line between that note and
// the `Hidden worktrees (N)` recovery list. A source whose repo override merely matches
// Global Settings exposes `Use global`, which drops that override. Source writes go
// through `catalog_set_worktree_visibility_sources` as a FULL REPLACE; the scan and
// per-item recovery go through `scan_worktrees` and `import_worktree`.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useAppStore } from "@/store";
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

// Orca scopes every visibility write to the modal's target host and fences the mutation so a
// dismissed modal cannot lose it. Hydra's sidebar can hold the same repo id/path on two hosts,
// so the write must name the host and only count once the host's row confirms it.
describe("WorktreeVisibilityDialog host scope + mutation fence (Orca parity)", () => {
  const TWO_HOST_REPOS = [
    { id: PROJECT.id, path: PROJECT.path, connectionId: null, executionHostId: "local" },
    { id: PROJECT.id, path: PROJECT.path, connectionId: "srv", executionHostId: "ssh:srv" },
  ];

  function catalogEnvelope(repo: Record<string, unknown>) {
    return { schemaVersion: 1, projectGroups: [], folderWorkspaces: [], repos: [repo] };
  }

  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({});
  });

  afterEach(() => {
    useAppStore.setState({ repos: [] });
  });

  it("sends the write to the target host when two hosts share id/path", async () => {
    useAppStore.setState({ repos: TWO_HOST_REPOS });
    invokeMock.mockImplementation((cmd: string) =>
      cmd === "catalog_set_worktree_visibility_sources"
        ? Promise.resolve(
            catalogEnvelope({
              id: "1",
              path: PROJECT.path,
              displayName: "repo",
              addedAt: 0,
              worktreeVisibilitySourcePreferences: { builtIn: { claude: "show" } },
            })
          )
        : Promise.resolve({})
    );

    renderDialog({ hostId: "ssh:srv" });
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
      executionHostId: "ssh:srv",
    });

    // The accepted echo moves the row: the write landed on the host that confirmed it.
    await waitFor(() =>
      expect(sourceToggle(sources, "Claude Code", "Show")).toHaveAttribute("aria-pressed", "true")
    );
  });

  it("rejects the write when the target host drops the additive source preferences", async () => {
    useAppStore.setState({
      repos: [{ id: PROJECT.id, path: PROJECT.path, connectionId: "old", executionHostId: "ssh:old" }],
    });
    invokeMock.mockImplementation((cmd: string) =>
      cmd === "catalog_set_worktree_visibility_sources"
        ? // Stale host: the row it writes back carries no source preferences at all.
          Promise.resolve(
            catalogEnvelope({ id: "1", path: PROJECT.path, displayName: "repo", addedAt: 0 })
          )
        : Promise.resolve({})
    );

    renderDialog({ hostId: "ssh:old" });
    const sources = screen.getByRole("region", { name: "Sources" });
    fireEvent.click(sourceToggle(sources, "Claude Code", "Show"));

    expect(invokeMock).toHaveBeenCalledWith(
      "catalog_set_worktree_visibility_sources",
      expect.objectContaining({
        sourcePreferences: { builtIn: { claude: "show" } },
        executionHostId: "ssh:old",
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This host doesn't support source-specific worktree visibility."
    );
    // No false success: the row stays on the host's real state and unlocks again.
    expect(sourceToggle(sources, "Claude Code", "Show")).toHaveAttribute("aria-pressed", "false");
    expect(sourceToggle(sources, "Claude Code", "Hide")).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(sourceToggle(sources, "Claude Code", "Show")).not.toBeDisabled()
    );
  });

  it("rehydrates the in-flight toggle after unmount/remount", async () => {
    useAppStore.setState({ repos: TWO_HOST_REPOS });
    const write = Promise.withResolvers<unknown>();
    invokeMock.mockImplementation((cmd: string) =>
      cmd === "catalog_set_worktree_visibility_sources" ? write.promise : Promise.resolve({})
    );

    const first = renderDialog({ hostId: "ssh:srv" });
    fireEvent.click(sourceToggle(screen.getByRole("region", { name: "Sources" }), "Claude Code", "Show"));
    await waitFor(() =>
      expect(
        sourceToggle(screen.getByRole("region", { name: "Sources" }), "Claude Code", "Show")
      ).toBeDisabled()
    );

    // Dismiss mid-write; the request outlives the modal.
    first.unmount();

    renderDialog({ hostId: "ssh:srv" });
    const remounted = screen.getByRole("region", { name: "Sources" });
    // The reopened modal rehydrates the fence: the rows stay locked until the write settles.
    expect(sourceToggle(remounted, "Claude Code", "Show")).toBeDisabled();

    await act(async () => {
      write.resolve(
        catalogEnvelope({
          id: "1",
          path: PROJECT.path,
          displayName: "repo",
          addedAt: 0,
          worktreeVisibilitySourcePreferences: { builtIn: { claude: "show" } },
        })
      );
      await write.promise;
    });

    await waitFor(() =>
      expect(sourceToggle(remounted, "Claude Code", "Show")).not.toBeDisabled()
    );
  });
});

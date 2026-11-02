// D09-008 / D09-012: the Projects filter panel is Orca's cmdk surface, rebuilt
// without the dependency. What matters is the contract the query and keyboard
// provide: a live-filtered list with an explicit empty state, a highlight that
// resets when the query changes, Enter selecting the highlighted row, Backspace
// removing the last selected project, and keystrokes that never reach the menu.
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SidebarProjectFilterPanel } from "./SidebarProjectFilterPanel";
import type { HydraProject } from "./types";

const HYDRA: HydraProject = {
  id: "repo_a",
  name: "hydra",
  displayName: "hydra",
  path: "/src/hydra",
  is_git: true,
  current_branch: "main",
};
const ORCA: HydraProject = {
  id: "repo_b",
  name: "orca",
  path: "/src/orca",
  is_git: true,
  current_branch: "main",
};
const REMOTE: HydraProject = {
  id: "repo_c",
  name: "build-server",
  path: "/srv/build-server",
  is_git: true,
  current_branch: "main",
  connectionId: "srv",
};

function renderPanel(args: {
  availableRepos?: readonly HydraProject[];
  selectedRepos?: readonly HydraProject[];
  filterRepoIds?: readonly string[];
  setFilterRepoIds?: (ids: string[]) => void;
}) {
  const setFilterRepoIds = args.setFilterRepoIds ?? vi.fn();
  render(
    <SidebarProjectFilterPanel
      availableRepos={args.availableRepos ?? [HYDRA, ORCA, REMOTE]}
      selectedRepos={args.selectedRepos ?? []}
      hasRepoFilter={(args.selectedRepos?.length ?? 0) > 0}
      filterRepoIds={args.filterRepoIds ?? []}
      setFilterRepoIds={setFilterRepoIds}
    />
  );
  return { setFilterRepoIds };
}

afterEach(() => cleanup());

describe("SidebarProjectFilterPanel (Orca SidebarProjectFilterPanel parity)", () => {
  it("focuses the query one frame after mount", async () => {
    renderPanel({});
    const input = screen.getByRole("combobox");
    // autoFocus would be yanked back by the menu's focus settling; the rAF does not.
    expect(document.activeElement).not.toBe(input);
    await act(async () => {
      const frame = Promise.withResolvers<void>();
      requestAnimationFrame(() => frame.resolve());
      await frame.promise;
    });
    expect(document.activeElement).toBe(input);
  });

  it("alternates the placeholder with the current selection", () => {
    renderPanel({});
    expect(screen.getByPlaceholderText("Filter projects...")).toBeInTheDocument();
    cleanup();
    renderPanel({ selectedRepos: [HYDRA], filterRepoIds: [HYDRA.id] });
    expect(screen.getByPlaceholderText("Add project...")).toBeInTheDocument();
  });

  it("filters the list and reports an explicit empty state", () => {
    renderPanel({});
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText("No projects match")).toBeInTheDocument();
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("says 'No unselected projects match' once a filter is applied", () => {
    renderPanel({ selectedRepos: [HYDRA], filterRepoIds: [HYDRA.id], availableRepos: [ORCA] });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzz" } });
    expect(screen.getByText("No unselected projects match")).toBeInTheDocument();
  });

  it("resets the keyboard highlight when the query changes", () => {
    renderPanel({});
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(document.querySelector('[data-active-project="true"]')?.textContent).toContain("orca");

    fireEvent.change(input, { target: { value: "hyd" } });
    // A single match is highlighted again by the derived first row.
    expect(document.querySelector('[data-active-project="true"]')?.textContent).toContain("hydra");
  });

  it("selects the highlighted project on Enter and clears the query", () => {
    const { setFilterRepoIds } = renderPanel({ filterRepoIds: [HYDRA.id] });
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(setFilterRepoIds).toHaveBeenCalledWith([HYDRA.id, ORCA.id]);
    expect(input).toHaveValue("");
  });

  it("removes the last selected project on Backspace with an empty query", () => {
    const { setFilterRepoIds } = renderPanel({
      selectedRepos: [HYDRA, ORCA],
      filterRepoIds: [HYDRA.id, ORCA.id],
      availableRepos: [REMOTE],
    });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Backspace" });
    expect(setFilterRepoIds).toHaveBeenCalledWith([HYDRA.id]);
  });

  it("keeps keystrokes inside the input instead of the menu typeahead", () => {
    const onMenuKeyDown = vi.fn();
    render(
      <div onKeyDown={onMenuKeyDown}>
        <SidebarProjectFilterPanel
          availableRepos={[HYDRA, ORCA]}
          selectedRepos={[]}
          hasRepoFilter={false}
          filterRepoIds={[]}
          setFilterRepoIds={vi.fn()}
        />
      </div>
    );
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "h" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onMenuKeyDown).not.toHaveBeenCalled();

    // Arrows are the menu's too, but the panel consumes them for the highlight.
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onMenuKeyDown).not.toHaveBeenCalled();
  });

  it("renders the repo badge label and the SSH marker", () => {
    renderPanel({});
    const remote = screen.getByRole("option", { name: /build-server/ });
    expect(remote.querySelector('[data-project-filter-ssh-badge]')).not.toBeNull();
    const local = screen.getByRole("option", { name: /hydra/ });
    expect(local.querySelector('[data-project-filter-ssh-badge]')).toBeNull();
  });

  it("stops Escape from closing the menu while a query can still be cleared", () => {
    const onMenuKeyDown = vi.fn();
    render(
      <div onKeyDown={onMenuKeyDown}>
        <SidebarProjectFilterPanel
          availableRepos={[HYDRA, ORCA]}
          selectedRepos={[]}
          hasRepoFilter={false}
          filterRepoIds={[]}
          setFilterRepoIds={vi.fn()}
        />
      </div>
    );
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "hyd" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onMenuKeyDown).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });
});

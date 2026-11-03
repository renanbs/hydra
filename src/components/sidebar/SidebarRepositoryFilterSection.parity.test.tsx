// D09-016 / D09-008: the Projects filter section. Orca keeps the row's value
// ("All projects" / one name / "N projects") derived from the LIVE project list so
// a removed project cannot inflate the count, hides the row when there is nothing
// to choose between, and lets another surface drive the same allow-list through
// the controlled props.
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  SidebarRepositoryFilterSection,
  getProjectFilterVisibilityLabel,
} from "./SidebarRepositoryFilterSection";
import type { HydraProject } from "./types";

const A: HydraProject = {
  id: "repo_a",
  name: "hydra",
  displayName: "hydra",
  path: "/src/hydra",
  is_git: true,
  current_branch: "main",
};
const B: HydraProject = {
  id: "repo_b",
  name: "orca",
  path: "/src/orca",
  is_git: true,
  current_branch: "main",
};

function renderSection(args: {
  projects?: readonly HydraProject[];
  filterRepoIds?: readonly string[];
  setFilterRepoIds?: (ids: string[]) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const setFilterRepoIds = args.setFilterRepoIds ?? vi.fn();
  const onOpenChange = args.onOpenChange ?? vi.fn();
  render(
    <SidebarRepositoryFilterSection
      projects={args.projects ?? [A, B]}
      filterRepoIds={args.filterRepoIds ?? []}
      setFilterRepoIds={setFilterRepoIds}
      open
      onOpenChange={onOpenChange}
      preserveWorkspaceBoardOpen
    />
  );
  return { setFilterRepoIds, onOpenChange };
}

afterEach(() => cleanup());

describe("getProjectFilterVisibilityLabel", () => {
  it("reads All projects, one name, or the count", () => {
    expect(getProjectFilterVisibilityLabel([])).toBe("All projects");
    expect(getProjectFilterVisibilityLabel([A])).toBe("hydra");
    expect(
      getProjectFilterVisibilityLabel([A, { ...B, displayName: "orca", name: "orca" }])
    ).toBe("2 projects");
  });
});

describe("SidebarRepositoryFilterSection (Orca parity)", () => {
  it("renders the derived visibility summary on the trigger", () => {
    renderSection({ filterRepoIds: [B.id] });
    expect(document.querySelector('[data-project-filter-trigger=""')).not.toBeNull();
    expect(document.querySelector('[data-project-filter-visibility=""')?.textContent).toBe(
      "orca"
    );
  });

  it("ignores stale ids so a removed project does not look filtered", () => {
    const view = renderSection({ filterRepoIds: ["repo_gone"], projects: [A, B] });
    expect(document.querySelector('[data-project-filter-visibility=""')?.textContent).toBe(
      "All projects"
    );
    // Nothing selected → Clear is disabled.
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
    expect(view.setFilterRepoIds).not.toHaveBeenCalled();
  });

  it("clears the filter through the controlled setter", () => {
    const { setFilterRepoIds } = renderSection({ filterRepoIds: [A.id] });
    expect(screen.getByText("· 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(setFilterRepoIds).toHaveBeenCalledWith([]);
  });

  it("selects every project from the bulk action", () => {
    const { setFilterRepoIds } = renderSection({});
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(setFilterRepoIds).toHaveBeenCalledWith([A.id, B.id]);
  });

  it("hides the row when only one project exists", () => {
    const { container } = render(
      <SidebarRepositoryFilterSection
        projects={[A]}
        filterRepoIds={[]}
        setFilterRepoIds={vi.fn()}
        open
        onOpenChange={vi.fn()}
      />
    );
    expect(container.querySelector('[data-project-filter-trigger=""')).toBeNull();
  });

  it("marks the submenu so board-preserving clicks keep the board open", () => {
    renderSection({});
    expect(
      document.querySelector('[data-project-filter-submenu=""]')?.hasAttribute(
        "data-workspace-board-preserve-open"
      )
    ).toBe(true);
  });

  it("toggles through the surrounding menu's open state", () => {
    const { onOpenChange } = renderSection({});
    fireEvent.click(document.querySelector('[data-project-filter-trigger=""]') as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

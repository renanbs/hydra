// Parity guard for the sidebar section headers. Two Orca invariants that this port
// broke once already, both invisible to `tsc`:
//   1. Orca NEVER paints a count badge; `count` only arms the collapse chevron
//      (`SectionHeader.tsx` upstream: `showHeaderCollapseAffordance = row.count > 0`).
//      Hydra rendered a `rounded-full` number chip on both group and repo headers.
//   2. A folder-backed group still gets the chevron + `+`, even with zero repos,
//      because Orca counts the subtree (repos + folder workspaces).
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { GroupSectionHeader, RepoSectionHeader } from "./SectionHeader";

function renderGroup(props: Partial<Parameters<typeof GroupSectionHeader>[0]> = {}) {
  return render(
    <GroupSectionHeader
      group={{ id: "g1", name: "MalhaClub Dev" }}
      isCollapsed={false}
      onToggleCollapse={vi.fn()}
      {...props}
    />
  );
}

describe("GroupSectionHeader (Orca parity)", () => {
  it("never paints a count badge", () => {
    const { container } = renderGroup({ count: 3 });
    expect(screen.getByText("MalhaClub Dev")).toBeInTheDocument();
    const badges = Array.from(container.querySelectorAll("span")).filter((el) =>
      el.className.includes("rounded-full") && /^\d+$/.test(el.textContent ?? "")
    );
    expect(badges, "Orca draws no numeric badge on headers").toHaveLength(0);
  });

  it("arms the collapse chevron only when the subtree has rows", () => {
    const withRows = renderGroup({ count: 1 });
    expect(
      withRows.container.querySelector("[data-repo-header-collapse-affordance]")
    ).not.toBeNull();

    const empty = renderGroup({ count: 0 });
    expect(
      empty.container.querySelector("[data-repo-header-collapse-affordance]")
    ).toBeNull();
  });

  it("renders the `+` create action on folder-backed groups", () => {
    const onOpenNewWorkspace = vi.fn();
    renderGroup({ count: 1, onOpenNewWorkspace });
    const add = screen.getByRole("button", { name: "New workspace in this group" });
    add.click();
    expect(onOpenNewWorkspace).toHaveBeenCalledTimes(1);
  });

  it("omits the `+` when no folder workspace can host it", () => {
    renderGroup({ count: 1 });
    expect(
      screen.queryByRole("button", { name: "New workspace in this group" })
    ).toBeNull();
  });

  it("exposes options menu and hover-revealed actions container", () => {
    const { container } = renderGroup({ count: 1, onContextMenu: vi.fn() });
    expect(screen.getByRole("button", { name: "Group options" })).toBeInTheDocument();
    const actions = container.querySelector("[data-repo-header-actions]");
    expect(actions).not.toBeNull();
    expect(actions?.className).toContain("group-hover:opacity-100");
  });
});

describe("RepoSectionHeader (Orca parity)", () => {
  const project = {
    id: "repo_1",
    name: "hydra",
    path: "/home/renan/src/hydra",
    is_git: true,
    current_branch: "main",
  };

  function renderRepo(props: Partial<Parameters<typeof RepoSectionHeader>[0]> = {}) {
    return render(
      <RepoSectionHeader
        project={project}
        isCollapsed={false}
        count={2}
        onToggleCollapse={vi.fn()}
        {...props}
      />
    );
  }

  it("never paints a count badge", () => {
    const { container } = renderRepo();
    const badges = Array.from(container.querySelectorAll("span")).filter((el) =>
      el.className.includes("rounded-full") && /^\d+$/.test(el.textContent ?? "")
    );
    expect(badges, "Orca draws no numeric badge on repo headers").toHaveLength(0);
  });

  it("arms the collapse chevron only with rows", () => {
    const withRows = renderRepo({ count: 1 });
    expect(
      withRows.container.querySelector("[data-repo-header-collapse-affordance]")
    ).not.toBeNull();
    const empty = renderRepo({ count: 0 });
    expect(
      empty.container.querySelector("[data-repo-header-collapse-affordance]")
    ).toBeNull();
  });

  it("renders the `+` only when a project can host a workspace", () => {
    const onOpenNewWorkspace = vi.fn();
    const withCreate = renderRepo({ onOpenNewWorkspace });
    screen.getByRole("button", { name: "New workspace in this project" }).click();
    expect(onOpenNewWorkspace).toHaveBeenCalledTimes(1);
    expect(withCreate.container).toBeTruthy();
  });
});

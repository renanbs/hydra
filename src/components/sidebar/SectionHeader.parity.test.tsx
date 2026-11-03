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

  it("disables the `+` behind a focusable span carrying the create tooltip (D03a-085)", () => {
    const onOpenNewWorkspace = vi.fn();
    const { container } = renderRepo({
      onOpenNewWorkspace,
      createState: {
        disabled: true,
        tooltip: "Reconnect SSH target before creating workspaces",
        ariaLabel: "Reconnect SSH target before creating workspaces for hydra",
      },
    });

    const trigger = container.querySelector("[data-repo-header-create-disabled]");
    expect(trigger).not.toBeNull();
    expect(trigger).toHaveAttribute("tabindex", "0");
    expect(trigger).toHaveAttribute(
      "title",
      "Reconnect SSH target before creating workspaces"
    );
    expect(trigger).toHaveAttribute(
      "aria-label",
      "Reconnect SSH target before creating workspaces for hydra"
    );

    const button = screen.getByRole("button", {
      name: "Reconnect SSH target before creating workspaces for hydra",
    });
    expect(button).toBeDisabled();

    trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onOpenNewWorkspace).not.toHaveBeenCalled();
  });

  it("uses the createState tooltip and aria label when the `+` is enabled", () => {
    const onOpenNewWorkspace = vi.fn();
    renderRepo({
      onOpenNewWorkspace,
      createState: {
        disabled: false,
        tooltip: "Create workspace for hydra",
        ariaLabel: "Create workspace for hydra",
      },
    });

    const button = screen.getByRole("button", { name: "Create workspace for hydra" });
    expect(button).toHaveAttribute("title", "Create workspace for hydra");
    button.click();
    expect(onOpenNewWorkspace).toHaveBeenCalledTimes(1);
  });
});

// D15a-008/D15a-009: the header reorder contract is DOM-visible. The pointer
// session measures `data-project-group-header-*` and arms only from
// `data-*-header-drag-handle`, which must exist on BOTH the row and the title
// surface, while the grab cursor stays off the action overlay.
describe("header drag DOM contract (D15a-008/D15a-009)", () => {
  function renderRepo(props: Partial<Parameters<typeof RepoSectionHeader>[0]> = {}) {
    return render(
      <RepoSectionHeader
        project={{
          id: "repo_1",
          name: "hydra",
          path: "/home/renan/src/hydra",
          is_git: true,
          current_branch: "main",
        }}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
        {...props}
      />
    );
  }

  it("renders project group drag attributes only when a pointer session is armed", () => {
    const idle = renderGroup({ dragBucket: "root", dragIndex: 1 });
    expect(idle.container.querySelector('[data-project-group-header-id="g1"]')).not.toBeNull();
    expect(
      idle.container.querySelector('[data-project-group-header-bucket="root"]')
    ).not.toBeNull();
    expect(idle.container.querySelector("[data-project-group-header-index]")).toHaveAttribute(
      "data-project-group-header-index",
      "1"
    );
    expect(idle.container.querySelectorAll("[data-project-group-header-drag-handle]")).toHaveLength(
      0
    );

    const armed = renderGroup({
      dragBucket: "root",
      dragIndex: 0,
      onHeaderPointerDown: vi.fn(),
    });
    expect(armed.container.querySelectorAll("[data-project-group-header-drag-handle]")).toHaveLength(
      2
    );
    const row = armed.container.querySelector('[data-project-group-header-id="g1"]');
    expect(row?.className).not.toContain("cursor-pointer");
    expect(row?.className).not.toContain("cursor-grab");
    const titleSurface = row?.firstElementChild;
    expect(titleSurface?.className).toContain("cursor-grab");
    expect(titleSurface?.className).toContain("active:cursor-grabbing");
  });

  it("keeps the repo header action overlay outside the grab cursor", () => {
    const idle = renderRepo();
    expect(idle.container.querySelectorAll("[data-repo-header-drag-handle]")).toHaveLength(0);
    expect(idle.container.querySelector('[data-repo-header-id="repo_1"]')?.className).toContain(
      "cursor-pointer"
    );

    const armed = renderRepo({ onHeaderPointerDown: vi.fn() });
    expect(armed.container.querySelectorAll("[data-repo-header-drag-handle]")).toHaveLength(2);
    const row = armed.container.querySelector('[data-repo-header-id="repo_1"]');
    expect(row?.className).not.toContain("cursor-pointer");
    const titleSurface = row?.firstElementChild;
    expect(titleSurface?.className).toContain("cursor-grab");
    const actions = armed.container.querySelector("[data-repo-header-actions]");
    expect(actions?.className).toContain("cursor-pointer");
  });
});

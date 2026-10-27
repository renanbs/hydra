import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/i18n";
import { SidebarHeader } from "./SidebarHeader";
import type { GroupByMode } from "./WorkspaceOptionsMenu";

function renderHeader(
  groupBy: GroupByMode,
  options: { sidebarBody?: "workspaces" | "agents"; introShown?: boolean } = {}
) {
  const optionsButtonRef = React.createRef<HTMLButtonElement>();
  const onAcknowledgeIntro = vi.fn();
  render(
    <SidebarHeader
      sidebarBody={options.sidebarBody ?? "workspaces"}
      setSidebarBody={vi.fn()}
      introShown={options.introShown ?? true}
      onAcknowledgeIntro={onAcknowledgeIntro}
      groupBy={groupBy}
      onOpenAddRepoDialog={vi.fn()}
      onOpenNewWorkspaceModal={vi.fn()}
      optionsButtonRef={optionsButtonRef}
      optionsMenuOpen={false}
      setOptionsMenuOpen={vi.fn()}
      projects={[]}
    />
  );
  return { onAcknowledgeIntro };
}

describe("SidebarHeader section title (D01-007)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows the Projects title when grouping by repo", () => {
    renderHeader("repo");

    const title = document.querySelector('[data-sidebar-section-title]');
    expect(title?.getAttribute("data-sidebar-section-title")).toBe("projects");
    expect(title?.textContent).toBe("Projects");
  });

  it("shows the Workspaces title when not grouping by repo", () => {
    renderHeader("none");

    const title = document.querySelector('[data-sidebar-section-title]');
    expect(title?.getAttribute("data-sidebar-section-title")).toBe("workspaces");
    expect(title?.textContent).toBe("Workspaces");
  });

  it("localizes the title through the shared catalog", async () => {
    renderHeader("repo");

    await act(async () => {
      await i18n.changeLanguage("es");
    });

    expect(await screen.findByText("Proyectos")).toBeInTheDocument();
  });
});

describe("SidebarHeader agents intro popover (D01-009)", () => {
  beforeAll(() => {
    // jsdom implements no ResizeObserver, and Radix Popover's content measures its own
    // size as it mounts. The stub only satisfies that call — nothing here asserts geometry.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
  });

  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows the intro when the agents view opens before it was acknowledged", () => {
    renderHeader("repo", { sidebarBody: "agents", introShown: false });
    expect(screen.getByText("Agents are easier to find")).toBeInTheDocument();
  });

  it("stays away once the preference records the acknowledgement", () => {
    renderHeader("repo", { sidebarBody: "agents", introShown: true });
    expect(screen.queryByText("Agents are easier to find")).toBeNull();
  });

  it("stays away outside the agents view", () => {
    renderHeader("repo", { sidebarBody: "workspaces", introShown: false });
    expect(screen.queryByText("Agents are easier to find")).toBeNull();
  });

  it("acknowledges through 'Got it'", () => {
    const { onAcknowledgeIntro } = renderHeader("repo", {
      sidebarBody: "agents",
      introShown: false,
    });
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(onAcknowledgeIntro).toHaveBeenCalledTimes(1);
  });

  it("dismisses with Escape", async () => {
    const { onAcknowledgeIntro } = renderHeader("repo", {
      sidebarBody: "agents",
      introShown: false,
    });
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(onAcknowledgeIntro).toHaveBeenCalled());
  });

  it("dismisses on a click outside", async () => {
    const { onAcknowledgeIntro } = renderHeader("repo", {
      sidebarBody: "agents",
      introShown: false,
    });
    // Radix attaches its outside pointerdown listener on a macrotask, so the popover
    // must settle before the synthetic click can land outside it.
    const settled = Promise.withResolvers<void>();
    setTimeout(settled.resolve, 0);
    await act(async () => {
      await settled.promise;
    });
    fireEvent.pointerDown(document.body, { button: 0 });
    // Radix Popover defers a primary-button outside dismissal to the following click.
    fireEvent.click(document.body);
    await waitFor(() => expect(onAcknowledgeIntro).toHaveBeenCalled());
  });
});

describe("SidebarHeader action cluster (D01-011 / D01-012)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("marks the Add project button as workspace-board-preserving", () => {
    renderHeader("repo");
    expect(
      screen.getByRole("button", { name: "Add project (Folder / Clone)" })
    ).toHaveAttribute("data-workspace-board-preserve-open");
  });

  it("targets the contextual tour from the New workspace button", () => {
    renderHeader("repo");
    expect(screen.getByRole("button", { name: /^New workspace/ })).toHaveAttribute(
      "data-contextual-tour-target",
      "workspace-create-control"
    );
  });

  it("labels New workspace with the registry shortcut rather than a hardcoded chord", () => {
    renderHeader("repo");
    expect(screen.getByRole("button", { name: /^New workspace \(.+\)$/ })).toBeInTheDocument();
  });
});

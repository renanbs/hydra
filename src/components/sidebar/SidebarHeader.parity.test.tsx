import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/i18n";
import { SidebarHeader } from "./SidebarHeader";
import type { GroupByMode } from "./WorkspaceOptionsMenu";

function renderHeader(groupBy: GroupByMode) {
  const optionsButtonRef = React.createRef<HTMLButtonElement>();
  render(
    <SidebarHeader
      sidebarBody="workspaces"
      setSidebarBody={vi.fn()}
      groupBy={groupBy}
      onOpenAddRepoDialog={vi.fn()}
      onOpenNewWorkspaceModal={vi.fn()}
      optionsButtonRef={optionsButtonRef}
      optionsMenuOpen={false}
      setOptionsMenuOpen={vi.fn()}
      projects={[]}
    />
  );
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

import { describe, expect, it, vi } from "vitest";

import {
  applyWorkspaceSidebarLiveWidth,
  getWorkspaceSidebarLiveWidthCss,
  WORKSPACE_SIDEBAR_LIVE_WIDTH_VAR,
} from "./sidebar-live-width";

function createRoot(): Pick<HTMLElement, "style"> {
  const properties = new Map<string, string>();
  return {
    style: {
      setProperty: (name: string, value: string) => {
        properties.set(name, value);
      },
      removeProperty: (name: string) => {
        properties.delete(name);
      },
      getPropertyValue: (name: string) => properties.get(name) ?? "",
    } as unknown as CSSStyleDeclaration,
  };
}

describe("workspace sidebar live width variable (Orca parity)", () => {
  it("publishes the live draft width while the sidebar is dragged", () => {
    const root = createRoot();
    applyWorkspaceSidebarLiveWidth(312.4, root);
    expect(root.style.getPropertyValue(WORKSPACE_SIDEBAR_LIVE_WIDTH_VAR)).toBe("312px");
  });

  it("defaults to the document root so anchored panels inherit it", () => {
    applyWorkspaceSidebarLiveWidth(280);
    expect(
      document.documentElement.style.getPropertyValue(WORKSPACE_SIDEBAR_LIVE_WIDTH_VAR)
    ).toBe("280px");
    applyWorkspaceSidebarLiveWidth(null);
    expect(
      document.documentElement.style.getPropertyValue(WORKSPACE_SIDEBAR_LIVE_WIDTH_VAR)
    ).toBe("");
  });

  it("drops the variable for a non-finite width instead of writing NaN", () => {
    const root = createRoot();
    applyWorkspaceSidebarLiveWidth(300, root);
    applyWorkspaceSidebarLiveWidth(Number.NaN, root);
    expect(root.style.getPropertyValue(WORKSPACE_SIDEBAR_LIVE_WIDTH_VAR)).toBe("");
  });

  it("falls back to the committed width when no drag is live", () => {
    expect(getWorkspaceSidebarLiveWidthCss(280)).toBe(
      "var(--workspace-sidebar-live-width, 280px)"
    );
  });
});

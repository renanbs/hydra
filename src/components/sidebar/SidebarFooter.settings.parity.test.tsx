import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Tooltip primitives are a UI boundary: render their content eagerly so the
// shortcut combo is asserted without depending on Radix open/timers.
vi.mock("@/components/ui/tooltip", async () => {
  const React = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const Content = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "tooltip-content" }, children);
  return {
    Tooltip: Passthrough,
    TooltipTrigger: Passthrough,
    TooltipProvider: Passthrough,
    TooltipContent: Content,
  };
});

import { SidebarFooter } from "./SidebarFooter";

describe("SidebarFooter settings control (D01-030/D01-034)", () => {
  it("exposes a translated aria-label and a shortcut combo tooltip", () => {
    render(
      <SidebarFooter
        appVersion={null}
        gitStatus={null}
        onOpenSettings={vi.fn()}
        workspaceBoardOpen={false}
        onToggleWorkspaceBoard={vi.fn()}
      />
    );

    const settings = screen.getByRole("button", { name: "Settings" });
    expect(settings).toBeInTheDocument();

    const tooltip = screen.getAllByTestId("tooltip-content")[0];
    expect(tooltip.textContent).toContain("Settings");
    expect(tooltip.textContent).toContain("Ctrl");
  });

  it("localizes the reveal-workspace control", () => {
    render(
      <SidebarFooter
        appVersion={null}
        gitStatus={null}
        onOpenSettings={vi.fn()}
        onRevealCurrent={vi.fn()}
        workspaceBoardOpen={false}
        onToggleWorkspaceBoard={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "Reveal active workspace" })
    ).toBeInTheDocument();
  });
});

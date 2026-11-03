import type React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/store";
import { SidebarFooter } from "./SidebarFooter";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn().mockResolvedValue("1.2.3") }));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

function renderFooter(
  overrides: Partial<React.ComponentProps<typeof SidebarFooter>> = {}
) {
  const onOpenSettings = vi.fn();
  const onOpenSettingsSection = vi.fn();
  const onToggleWorkspaceBoard = vi.fn();
  const utils = render(
    <TooltipProvider>
      <SidebarFooter
        appVersion="1.2.3"
        gitStatus={null}
        onOpenSettings={onOpenSettings}
        onOpenSettingsSection={onOpenSettingsSection}
        workspaceBoardOpen={false}
        onToggleWorkspaceBoard={onToggleWorkspaceBoard}
        {...overrides}
      />
    </TooltipProvider>
  );
  return { onOpenSettings, onOpenSettingsSection, onToggleWorkspaceBoard, ...utils };
}


describe("SidebarFooter workspace board trigger (Orca SidebarToolbar parity)", () => {
  it("exposes the board trigger in the sidebar footer", () => {
    renderFooter({ workspaceBoardOpen: false });

    const trigger = document.querySelector("[data-workspace-board-trigger]");
    expect(trigger).not.toBeNull();
    expect(screen.getByRole("button", { name: "Workspace board" })).toBe(trigger);
    expect(trigger?.getAttribute("aria-pressed")).toBe("false");
  });

  it("reports the open state through aria-pressed", () => {
    renderFooter({ workspaceBoardOpen: true });

    expect(
      document.querySelector("[data-workspace-board-trigger]")?.getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("toggles the board when clicked", () => {
    const { onToggleWorkspaceBoard } = renderFooter({ workspaceBoardOpen: false });

    fireEvent.click(screen.getByRole("button", { name: "Workspace board" }));

    expect(onToggleWorkspaceBoard).toHaveBeenCalledTimes(1);
  });
});

describe("SidebarFooter workspace-board trigger (D01-032/D01-033)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    act(() => {
      useAppStore.setState({ persistedUIReady: false, featureInteractions: {} });
    });
  });

  afterEach(() => {
    act(() => {
      useAppStore.setState({ persistedUIReady: false, featureInteractions: {} });
    });
  });

  it("marks the drag preview and uses the secondary variant while previewing", () => {
    renderFooter({ workspaceBoardDragPreviewOpen: true });

    const trigger = document.querySelector("[data-workspace-board-trigger]");
    expect(trigger).toHaveAttribute("data-workspace-board-preview", "true");
    expect(trigger?.className).toContain("bg-secondary");
  });

  it("does not paint the preview attribute outside a drag", () => {
    renderFooter();
    const trigger = document.querySelector("[data-workspace-board-trigger]");
    expect(trigger).not.toHaveAttribute("data-workspace-board-preview");
  });

  it("shows the relocation hint once for existing board users and closes it on click", async () => {
    act(() => {
      useAppStore.setState({
        persistedUIReady: true,
        featureInteractions: {
          "workspace-board": { firstInteractedAt: 1, interactionCount: 1 },
        },
      });
    });
    const { onToggleWorkspaceBoard } = renderFooter();

    await screen.findByText("Workspace board moved to the bottom bar");
    expect(window.localStorage.getItem("hydra.workspaceBoardMovedHintSeen.v1")).toBe("true");

    fireEvent.click(document.querySelector("[data-workspace-board-trigger]")!);
    expect(onToggleWorkspaceBoard).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByText("Workspace board moved to the bottom bar")).toBeNull()
    );
  });

  it("never shows the relocation hint to first-time board users", async () => {
    act(() => {
      useAppStore.setState({ persistedUIReady: true, featureInteractions: {} });
    });
    renderFooter();

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText("Workspace board moved to the bottom bar")).toBeNull();
    expect(window.localStorage.getItem("hydra.workspaceBoardMovedHintSeen.v1")).toBeNull();
  });
});

describe("SidebarFooter help menu (D01-035/D01-036)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("opens on the Help button and routes Keyboard Shortcuts to the settings pane", async () => {
    const { onOpenSettingsSection } = renderFooter();

    const help = screen.getByRole("button", { name: "Help" });
    expect(help).toHaveAttribute("aria-expanded", "false");
    fireEvent.pointerDown(help);

    const shortcuts = await screen.findByRole("menuitem", { name: "Keyboard Shortcuts" });
    expect(help).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(shortcuts);
    expect(onOpenSettingsSection).toHaveBeenCalledWith("shortcuts");
  });

  it("preloads the feedback chunk and mounts the dialog when Send Feedback is selected", async () => {
    renderFooter();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Help" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Send Feedback" }));

    expect(await screen.findByRole("dialog", { name: "Send Feedback" })).toBeInTheDocument();
  });
});

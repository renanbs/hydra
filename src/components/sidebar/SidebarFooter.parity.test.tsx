import type React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/store";
import { DEFAULT_HYDRA_SETTINGS, type HydraSettings } from "@/shared/settings-types";
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

type HelpMenuStoreProbe = {
  activeModal: string;
  modalData: Record<string, unknown>;
};

function readHelpMenuStore(): HelpMenuStoreProbe {
  // Why the cast: the composed UI slice is typed `any` on this branch, so AppState
  // does not name the modal fields at compile time.
  return useAppStore.getState() as unknown as HelpMenuStoreProbe;
}

function helpMenuSettings(overrides: Partial<HydraSettings> = {}): HydraSettings {
  return { ...DEFAULT_HYDRA_SETTINGS, ...overrides };
}

function resetHelpMenuStore(): void {
  act(() => {
    useAppStore.setState({
      persistedUIReady: true,
      activeModal: "none",
      modalData: {},
      featureInteractions: {},
      repos: [],
      worktreesByRepo: {},
      setupGuideSidebarDismissed: false,
    });
  });
}

describe("SidebarFooter Help menu internals (D01-036)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetHelpMenuStore();
  });

  afterEach(() => {
    window.localStorage.clear();
    resetHelpMenuStore();
  });

  it("keeps every help destination and adds Milestones with live progress", async () => {
    renderFooter({ settings: helpMenuSettings({ notification_on_blocked: false }) });

    fireEvent.pointerDown(screen.getByRole("button", { name: "Help" }));

    expect(await screen.findByRole("menuitem", { name: "Keyboard Shortcuts" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Send Feedback" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Milestones/ })).toBeInTheDocument();
    expect(screen.getByLabelText("0 of 8 setup steps complete")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Docs" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Changelog" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "GitHub" })).toBeInTheDocument();
  });

  it("hides Milestones once every core milestone is complete", async () => {
    window.localStorage.setItem("orca.orchestration.enabled", "1");
    act(() => {
      useAppStore.setState({
        featureInteractions: {
          browser: { firstInteractedAt: 1, interactionCount: 1 },
          "github-tasks": { firstInteractedAt: 2, interactionCount: 1 },
        } as never,
        repos: [
          { id: "repo-1", kind: "git", hookSettings: { scripts: { setup: "pnpm install" } } },
          { id: "repo-2", kind: "git" },
        ] as never,
        worktreesByRepo: {
          "repo-1": [
            { id: "repo-1::/repo", path: "/repo", isMainWorktree: true },
            { id: "repo-1::/repo/feature", path: "/repo/feature", isMainWorktree: false },
          ],
        } as never,
      });
    });
    renderFooter({
      settings: helpMenuSettings({ default_tui_agent: "claude", notification_on_blocked: true }),
    });

    fireEvent.pointerDown(screen.getByRole("button", { name: "Help" }));

    expect(await screen.findByRole("menuitem", { name: "Onboarding" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Milestones" })).toBeNull();
  });

  it("opens the shared setup-guide modal from Milestones and Onboarding", async () => {
    renderFooter({ settings: helpMenuSettings() });

    fireEvent.pointerDown(screen.getByRole("button", { name: "Help" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /Milestones/ }));

    expect(readHelpMenuStore().activeModal).toBe("setup-guide");
    expect(readHelpMenuStore().modalData.telemetrySource).toBe("help_menu");

    act(() => {
      useAppStore.setState({ activeModal: "none", modalData: {} });
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Help" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Onboarding" }));

    expect(readHelpMenuStore().activeModal).toBe("setup-guide");
    expect(readHelpMenuStore().modalData.telemetrySource).toBe("help_menu");
  });
});

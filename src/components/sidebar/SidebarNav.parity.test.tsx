import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as TauriCore from "@tauri-apps/api/core";
import { useAppStore } from "@/store";
import { formatShortcutKeyComboDetails } from "@/hooks/useShortcutLabel";
import { DEFAULT_HYDRA_SETTINGS, type HydraSettings } from "@/shared/settings-types";
import { SidebarNav } from "./SidebarNav";
vi.mock("@tauri-apps/api/core", async (importOriginal) => {
  const mod = await (importOriginal as () => Promise<typeof TauriCore>)();
  return { ...mod, invoke: vi.fn(async () => ({ devices: [] })) };
});
function settings(overrides: Partial<HydraSettings> = {}): HydraSettings {
  return { ...DEFAULT_HYDRA_SETTINGS, ...overrides };
}

function renderNav(overrides: Partial<HydraSettings> = {}) {
  const onOpenWorktreePalette = vi.fn();
  const onUpdateSettings = vi.fn();
  const utils = render(
    <SidebarNav
      settings={settings(overrides)}
      onUpdateSettings={onUpdateSettings}
      onOpenWorktreePalette={onOpenWorktreePalette}
    />
  );
  return { onOpenWorktreePalette, onUpdateSettings, ...utils };
}

describe("SidebarNav search entry (D01-016)", () => {
  beforeEach(() => {
    useAppStore.setState({ activeView: "terminal" });
  });

  it("opens the worktree palette on click", () => {
    const { onOpenWorktreePalette } = renderNav();

    fireEvent.click(
      screen.getByRole("button", { name: "Search worktrees and browser tabs" })
    );

    expect(onOpenWorktreePalette).toHaveBeenCalledTimes(1);
  });

  it("shows the real worktree.palette combo instead of a literal chip, revealed on hover and focus", () => {
    const { container } = renderNav();

    const chip = container.querySelector('[class*="group-focus-within:flex"]');
    expect(chip).not.toBeNull();
    expect(chip!.className).toContain("group-hover:flex");
    expect(chip!.className).toContain("group-focus-within:flex");

    const combos = formatShortcutKeyComboDetails("worktree.palette");
    expect(combos.length).toBeGreaterThan(0);
    for (const key of combos[0].keys) {
      expect(chip!.textContent).toContain(key);
    }

    expect(screen.queryByText("⌘P")).toBeNull();
  });
});

describe("SidebarNav view entries (D01-018/D01-021..D01-025)", () => {
  beforeEach(() => {
    useAppStore.setState({ activeView: "terminal" });
    window.localStorage.clear();
  });

  afterEach(() => {
    useAppStore.setState({ activeView: "terminal" });
  });

  it("renders Tasks enabled with zero repositories and highlights the active view", () => {
    useAppStore.setState({ activeView: "tasks" });
    renderNav({ showTasksButton: true });

    const tasks = screen.getByRole("button", { name: "Tasks" });
    expect(tasks).toHaveAttribute("aria-current", "page");
    expect(tasks).toHaveAttribute("data-contextual-tour-target", "sidebar-tasks");
    expect(useAppStore.getState().repos).toEqual([]);
  });

  it("keeps Artifacts and Skills hidden by default and shows Automations/Mobile", () => {
    renderNav();

    expect(screen.queryByRole("button", { name: "Artifacts" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Skills" })).toBeNull();
    expect(screen.getByRole("button", { name: "Automations" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Orca Mobile/ })).toBeInTheDocument();
  });

  it("hides the Mobile entry when showMobileButton is off", () => {
    renderNav({ showMobileButton: false });

    expect(screen.queryByRole("button", { name: /Orca Mobile/ })).toBeNull();
  });

  it("hides Mobile through its context menu writer", async () => {
    const { onUpdateSettings } = renderNav({ showMobileButton: true });

    fireEvent.contextMenu(screen.getByRole("button", { name: /Orca Mobile/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Hide from sidebar" }));

    expect(onUpdateSettings).toHaveBeenCalledWith({ showMobileButton: false });
  });

  it("does not render the paired-device inline hide until a device list exists", () => {
    renderNav({ showMobileButton: true });

    // No device-listing IPC in Hydra, so the inline EyeOff stays absent; only
    // the context-menu hide affordance is honest today.
    expect(screen.queryByRole("button", { name: "Hide from sidebar" })).toBeNull();
  });

  it("opens each configured page and marks it current", () => {
    renderNav({
      showArtifactsButton: true,
      showSkillsButton: true,
      showAutomationsButton: true,
      showMobileButton: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "Artifacts" }));
    expect(useAppStore.getState().activeView).toBe("artifacts");
    expect(screen.getByRole("button", { name: "Artifacts" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    fireEvent.click(screen.getByRole("button", { name: "Skills" }));
    expect(useAppStore.getState().activeView).toBe("skills");

    fireEvent.click(screen.getByRole("button", { name: "Automations" }));
    expect(useAppStore.getState().activeView).toBe("automations");
  });

  it("shows the one-time New badge on mobile and dismisses it on first view", async () => {
    renderNav({ showMobileButton: true });

    expect(screen.getByText("New")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Orca Mobile/ }));

    expect(useAppStore.getState().activeView).toBe("mobile");
    await waitFor(() => expect(screen.queryByText("New")).toBeNull());
    expect(window.localStorage.getItem("hydra.mobile.sidebar-onboarding-dismissed")).toBe("1");
  });

  it("hides an entry through the shared context menu writer", async () => {
    const { onUpdateSettings } = renderNav({ showAutomationsButton: true });

    fireEvent.contextMenu(screen.getByRole("button", { name: "Automations" }));
    const hideItem = await screen.findByRole("menuitem", { name: "Hide from sidebar" });
    fireEvent.click(hideItem);

    expect(onUpdateSettings).toHaveBeenCalledWith({ showAutomationsButton: false });
    expect(hideItem).toHaveTextContent("Hide from sidebar");
  });
});

describe("SidebarNav onboarding checklist entry (D01-017)", () => {
  function renderNavWithSettings(overrides: Partial<HydraSettings> = {}) {
    return render(
      <TooltipProvider>
        <SidebarNav settings={settings(overrides)} onUpdateSettings={vi.fn()} />
      </TooltipProvider>
    );
  }

  beforeEach(() => {
    window.localStorage.clear();
    act(() => {
      useAppStore.setState({
        persistedUIReady: false,
        activeModal: "none",
        modalData: {},
        featureInteractions: {},
        repos: [],
        worktreesByRepo: {},
        setupGuideSidebarDismissed: false,
      });
    });
  });

  afterEach(() => {
    act(() => {
      useAppStore.setState({
        persistedUIReady: false,
        activeModal: "none",
        modalData: {},
        setupGuideSidebarDismissed: false,
      });
    });
  });

  it("shows the entry only after hydration, before completion, and before an explicit hide", () => {
    renderNavWithSettings();
    expect(screen.queryByRole("button", { name: /Onboarding checklist/ })).toBeNull();

    act(() => {
      useAppStore.setState({ persistedUIReady: true });
    });
    expect(screen.getByRole("button", { name: /Onboarding checklist/ })).toBeInTheDocument();

    act(() => {
      useAppStore.setState({ setupGuideSidebarDismissed: true });
    });
    expect(screen.queryByRole("button", { name: /Onboarding checklist/ })).toBeNull();
  });
});

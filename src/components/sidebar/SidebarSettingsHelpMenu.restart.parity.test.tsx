import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  isAppRestartAvailable,
  restartApp,
} from "@/lib/sidebar-desktop-contracts";
import { SidebarSettingsHelpMenu } from "./SidebarSettingsHelpMenu";

vi.mock("@/lib/sidebar-desktop-contracts", () => ({
  openExternalUrl: vi.fn().mockResolvedValue(undefined),
  checkForAppUpdates: vi.fn(),
  isAppRestartAvailable: vi.fn(() => true),
  isUpdateCheckAvailable: vi.fn(() => false),
  restartApp: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

function renderMenu() {
  const onOpenSettingsSection = vi.fn();
  render(
    <TooltipProvider delayDuration={0}>
      <SidebarSettingsHelpMenu onOpenSettingsSection={onOpenSettingsSection} />
    </TooltipProvider>
  );
  return { onOpenSettingsSection };
}

async function openRestartItem(): Promise<HTMLElement> {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Help" }));
  return screen.findByRole("menuitem", { name: "Restart Hydra" });
}

describe("SidebarSettingsHelpMenu restart (D01-039)", () => {
  beforeEach(() => {
    vi.mocked(restartApp).mockReset().mockResolvedValue(undefined);
    vi.mocked(isAppRestartAvailable).mockReturnValue(true);
    vi.mocked(toast.info).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("announces the restart and invokes the host command", async () => {
    renderMenu();

    const item = await openRestartItem();
    fireEvent.click(item);

    expect(toast.info).toHaveBeenCalledWith("Restarting Hydra…");
    expect(restartApp).toHaveBeenCalledTimes(1);
  });

  it("restores the item and reports a failed restart", async () => {
    vi.mocked(restartApp).mockRejectedValueOnce(new Error("ipc closed"));
    renderMenu();

    const item = await openRestartItem();
    fireEvent.click(item);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(vi.mocked(toast.error).mock.calls[0][0]).toBe("Couldn't restart Hydra.");
    expect(vi.mocked(toast.error).mock.calls[0][1]).toMatchObject({
      description: "ipc closed",
    });
  });

  it("explains why restart is unavailable outside the Tauri host", async () => {
    vi.mocked(isAppRestartAvailable).mockReturnValue(false);
    renderMenu();

    const item = await openRestartItem();
    expect(item).toHaveAttribute(
      "title",
      "Application restart is not available in this build."
    );
  });
});

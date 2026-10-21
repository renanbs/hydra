import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SuppressExternalWorktreeInboxDialog } from "./SuppressExternalWorktreeInboxDialog";

function renderDialog(overrides: Partial<Parameters<typeof SuppressExternalWorktreeInboxDialog>[0]> = {}) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  const onOpenRecovery = vi.fn();
  render(
    <SuppressExternalWorktreeInboxDialog
      open
      repoDisplayName="hydra"
      pending={false}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      onOpenRecovery={onOpenRecovery}
      {...overrides}
    />
  );
  return { onOpenChange, onConfirm, onOpenRecovery };
}

describe("SuppressExternalWorktreeInboxDialog (Orca parity)", () => {
  it("names the repo and warns that later worktrees stay hidden", () => {
    renderDialog();
    expect(screen.getByText("Hide external worktrees?")).toBeInTheDocument();
    expect(screen.getByText(/including ones created later/i)).toBeInTheDocument();
  });

  it("confirms, cancels and opens the recovery settings", () => {
    const { onConfirm, onOpenChange, onOpenRecovery } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Hide external worktrees" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "Open Non-Orca worktrees settings" }));
    expect(onOpenRecovery).toHaveBeenCalledTimes(1);
  });

  it("locks both actions while the suppression is in flight", () => {
    renderDialog({ pending: true });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Hiding…" })).toBeDisabled();
  });
});

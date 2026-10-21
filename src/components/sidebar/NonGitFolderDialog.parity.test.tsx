import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NonGitFolderDialog } from "./NonGitFolderDialog";

function renderDialog(overrides: Partial<Parameters<typeof NonGitFolderDialog>[0]> = {}) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  render(
    <NonGitFolderDialog
      open
      folderPath="/work/notes"
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      {...overrides}
    />
  );
  return { onOpenChange, onConfirm };
}

describe("NonGitFolderDialog (Orca parity)", () => {
  it("explains which features work and shows the folder path", () => {
    renderDialog();
    expect(screen.getByText("Not a Git repository")).toBeInTheDocument();
    expect(screen.getByText(/editor, terminal and search work/i)).toBeInTheDocument();
    expect(screen.getByText("/work/notes")).toBeInTheDocument();
  });

  it("names the host where the folder was verified", () => {
    renderDialog({ hostLabel: "Build server" });
    expect(screen.getByText(/on Build server/i)).toBeInTheDocument();
  });

  it("confirms opening the folder and cancels without writing", () => {
    const { onConfirm, onOpenChange } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Open as folder project" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });
});

import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RemoveFolderDialog } from "./RemoveFolderDialog";

function renderDialog(
  host: Parameters<typeof RemoveFolderDialog>[0]["host"],
  overrides: Partial<Parameters<typeof RemoveFolderDialog>[0]> = {}
) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  render(
    <RemoveFolderDialog
      open
      projectName="hydra"
      host={host}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      {...overrides}
    />
  );
  return { onOpenChange, onConfirm };
}

describe("RemoveFolderDialog (Orca parity)", () => {
  it("says a local project stays on disk and confirms removal", () => {
    const { onConfirm } = renderDialog({ kind: "local" });
    expect(screen.getByText("Remove Project")).toBeInTheDocument();
    expect(screen.getByText(/still on your disk/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("names the SSH host the files stay on", () => {
    renderDialog({ kind: "ssh", label: "Build server" });
    expect(screen.getByText(/files stay on Build server/i)).toBeInTheDocument();
  });

  it("defers to the VM recipe policy for runtime-owned projects", () => {
    renderDialog({ kind: "vm" });
    expect(screen.getByText(/VM recipe determines/i)).toBeInTheDocument();
  });

  it("cancels through the button and Escape without confirming", () => {
    const { onOpenChange, onConfirm } = renderDialog({ kind: "local" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

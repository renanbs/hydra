import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AutoRenameFailedDialog } from "./AutoRenameFailedDialog";

const LONG_ERROR = "fatal: " + "verylongtoken".repeat(30) + "\nsecond line";

describe("AutoRenameFailedDialog output block (D10-004)", () => {
  it("wraps literal output in a gutter-reserving scroll region", () => {
    const { container } = render(
      <AutoRenameFailedDialog
        open
        onOpenChange={vi.fn()}
        worktreeName="feat/x"
        error={LONG_ERROR}
      />
    );
    const output = container.querySelector(".whitespace-pre-wrap");
    expect(output).not.toBeNull();
    expect(output).toHaveClass("[overflow-wrap:anywhere]");
    expect(output).toHaveClass("pr-9");
    expect(output).toHaveTextContent("second line");
  });

  it("keeps the copy control inside the region with an accessible name", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <AutoRenameFailedDialog open onOpenChange={vi.fn()} worktreeName="feat/x" error="boom" />
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy error" }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("boom"));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
import { AutoRenameFailedDialog } from "./AutoRenameFailedDialog";

const LONG_ERROR = "fatal: " + "verylongtoken".repeat(30) + "\nsecond line";

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(null);
});

describe("AutoRenameFailedDialog full output (D10-001)", () => {
  it("prefers the captured output when the host still has it", async () => {
    invokeMock.mockResolvedValue("fatal: provider exited 401\nfull trace");
    render(
      <AutoRenameFailedDialog
        open
        onOpenChange={vi.fn()}
        worktreeId="repo_a::/repo/feature"
        worktreeName="feat/x"
        error="excerpt"
      />
    );
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("get_branch_rename_failure_output", {
        worktreeId: "repo_a::/repo/feature",
      })
    );
    expect(await screen.findByText(/full trace/)).toBeInTheDocument();
  });

  it("falls back to the persisted excerpt when the host returns null", async () => {
    render(
      <AutoRenameFailedDialog
        open
        onOpenChange={vi.fn()}
        worktreeId="repo_a::/repo/feature"
        worktreeName="feat/x"
        error="persisted excerpt"
      />
    );
    expect(await screen.findByText(/persisted excerpt/)).toBeInTheDocument();
  });
});

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

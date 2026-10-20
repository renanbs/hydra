import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WorktreeMetaDialog } from "./WorktreeMetaDialog";
import type { WorktreeMetadataDraft } from "./worktree-metadata-types";

const INITIAL: WorktreeMetadataDraft = {
  displayName: "feat/parent",
  comment: "notes",
  linkedIssue: 12,
  linkedPR: 34,
  linkedLinearIssue: "ENG-7",
};

function renderDialog(overrides: Partial<Parameters<typeof WorktreeMetaDialog>[0]> = {}) {
  const onSave = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <WorktreeMetaDialog
      open
      worktreeName="feat/parent"
      initial={INITIAL}
      onOpenChange={onOpenChange}
      onSave={onSave}
      {...overrides}
    />
  );
  return { onSave, onOpenChange };
}

describe("WorktreeMetaDialog (Orca parity)", () => {
  it("seeds every field from persisted metadata", () => {
    renderDialog();
    expect(screen.getByDisplayValue("feat/parent")).toBeInTheDocument();
    expect(screen.getByDisplayValue("notes")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12")).toBeInTheDocument();
    expect(screen.getByDisplayValue("34")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ENG-7")).toBeInTheDocument();
  });

  it("saves the edited draft with numbers parsed and blanks cleared", () => {
    const { onSave } = renderDialog();
    fireEvent.change(screen.getByDisplayValue("12"), { target: { value: "#77" } });
    fireEvent.change(screen.getByDisplayValue("notes"), { target: { value: "  " } });
    fireEvent.change(screen.getByDisplayValue("ENG-7"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({
      displayName: "feat/parent",
      comment: "  ",
      linkedIssue: 77,
      linkedPR: 34,
      linkedLinearIssue: null,
    });
  });

  it("rejects a non-numeric issue without writing", () => {
    const { onSave } = renderDialog();
    fireEvent.change(screen.getByDisplayValue("12"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/positive numbers/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancels without saving", () => {
    const { onSave, onOpenChange } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onSave).not.toHaveBeenCalled();
  });
});

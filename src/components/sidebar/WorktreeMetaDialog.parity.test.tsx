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
  linkedLinearIssue: null,
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
  it("seeds the fields from persisted metadata", () => {
    renderDialog();
    expect(screen.getByDisplayValue("feat/parent")).toBeInTheDocument();
    expect(screen.getByDisplayValue("notes")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12")).toBeInTheDocument();
    expect(screen.getByDisplayValue("34")).toBeInTheDocument();
  });

  it("seeds the issue field with a persisted Linear link", () => {
    renderDialog({ initial: { ...INITIAL, linkedIssue: null, linkedLinearIssue: "ENG-7" } });
    expect(screen.getByDisplayValue("ENG-7")).toBeInTheDocument();
  });

  it("saves the edited draft with numbers parsed and blanks cleared", () => {
    const { onSave } = renderDialog();
    fireEvent.change(screen.getByDisplayValue("12"), { target: { value: "#77" } });
    fireEvent.change(screen.getByDisplayValue("notes"), { target: { value: "  " } });
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

    expect(screen.getByRole("status")).toHaveTextContent(/not a github issue/i);
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

  it("resolves a pasted GitHub issue URL to its number", () => {
    const { onSave } = renderDialog();
    fireEvent.change(screen.getByDisplayValue("12"), {
      target: { value: "https://github.com/acme/hydra/issues/77" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ linkedIssue: 77, linkedLinearIssue: null })
    );
  });

  it("moves a pasted Linear issue URL into the Linear link", () => {
    const { onSave } = renderDialog();
    fireEvent.change(screen.getByDisplayValue("12"), {
      target: { value: "https://linear.app/acme/issue/ENG-42/fix-it" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ linkedIssue: null, linkedLinearIssue: "ENG-42" })
    );
  });
});

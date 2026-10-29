import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WorktreeVisibilitySourceAddForm } from "./WorktreeVisibilitySourceAddForm";
import type { WorktreeVisibilitySourceAddResult } from "./WorktreeVisibilitySourceAddForm";

function renderForm(result: WorktreeVisibilitySourceAddResult) {
  const onAdd = vi.fn().mockResolvedValue(result);
  render(<WorktreeVisibilitySourceAddForm disabled={false} onAdd={onAdd} />);
  const input = document.querySelector<HTMLInputElement>("#custom-worktree-root")!;
  fireEvent.change(input, { target: { value: "/work/roots" } });
  fireEvent.submit(input.closest("form")!);
  return { input, onAdd };
}

describe("WorktreeVisibilitySourceAddForm (D10-054)", () => {
  it("links the help id and flags the input when the path is invalid", async () => {
    const { input } = renderForm("invalid-path");
    expect(await screen.findByRole("alert")).toHaveTextContent(/absolute path/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "custom-worktree-root-help");
  });

  it("explains duplicate and limit failures", async () => {
    renderForm("duplicate-path");
    expect(await screen.findByRole("alert")).toHaveTextContent(/already listed/i);
  });

  it("resets the field after a successful add", async () => {
    const { input, onAdd } = renderForm("added");
    await vi.waitFor(() => expect(onAdd).toHaveBeenCalledWith("/work/roots"));
    await vi.waitFor(() => expect(input).toHaveValue(""));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the value and shows no inline error when the host save fails", async () => {
    const { input } = renderForm("save-failed");
    await vi.waitFor(() => expect(input).toHaveValue("/work/roots"));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProjectGroupDeleteDialog } from "./ProjectGroupDeleteDialog";

function renderDialog(overrides: Partial<Parameters<typeof ProjectGroupDeleteDialog>[0]> = {}) {
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  const onOpenChange = vi.fn();
  render(
    <ProjectGroupDeleteDialog
      open
      groupName="Marketplace"
      projectCount={2}
      projectNames={["hydra", "orca"]}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      {...overrides}
    />
  );
  return { onConfirm, onOpenChange };
}

describe("ProjectGroupDeleteDialog (D02c-015)", () => {
  it("offers the contained-projects option and defaults it off", async () => {
    const { onConfirm } = renderDialog();
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Delete Group" }));

    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it("reports removeContained=true when the user opts in", () => {
    const { onConfirm } = renderDialog();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Delete Group" }));

    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it("hides the option when the group has no projects", () => {
    renderDialog({ projectCount: 0, projectNames: [] });
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

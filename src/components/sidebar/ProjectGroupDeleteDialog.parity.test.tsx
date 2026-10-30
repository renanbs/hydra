import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProjectGroupDeleteDialog } from "./ProjectGroupDeleteDialog";

function ControlledDialog({
  overrides = {},
  initialRemoveContained = false,
  onConfirm,
}: {
  overrides?: Partial<Parameters<typeof ProjectGroupDeleteDialog>[0]>;
  initialRemoveContained?: boolean;
  onConfirm: () => void;
}) {
  const [removeContainedProjects, setRemoveContainedProjects] = useState(
    initialRemoveContained
  );
  return (
    <ProjectGroupDeleteDialog
      open
      groupName="Marketplace"
      projectCount={2}
      projectNames={["hydra", "orca"]}
      onOpenChange={vi.fn()}
      onConfirm={onConfirm}
      {...overrides}
      removeContainedProjects={removeContainedProjects}
      onRemoveContainedProjectsChange={setRemoveContainedProjects}
    />
  );
}

function renderDialog(overrides: Partial<Parameters<typeof ProjectGroupDeleteDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  render(<ControlledDialog overrides={overrides} onConfirm={onConfirm} />);
  return { onConfirm };
}

describe("ProjectGroupDeleteDialog (D02c-015 / D03a-086)", () => {
  it("offers the contained-projects option and defaults it off", () => {
    const { onConfirm } = renderDialog();
    const checkbox = screen.getByRole("checkbox", { name: "Remove 2 contained projects" });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Delete Group" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(checkbox).not.toBeChecked();
  });

  it("reflects the parent-owned removeContainedProjects choice", () => {
    const onConfirm = vi.fn();
    render(
      <ControlledDialog
        initialRemoveContained
        onConfirm={onConfirm}
      />
    );
    const checkbox = screen.getByRole("checkbox", { name: "Remove 2 contained projects" });
    expect(checkbox).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Delete Group" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows the singular copy and hides the option when the group has no projects", () => {
    render(
      <ControlledDialog
        overrides={{ projectCount: 1, projectNames: ["hydra"] }}
        onConfirm={vi.fn()}
      />
    );
    expect(
      screen.getByRole("checkbox", { name: "Remove 1 contained project" })
    ).toBeInTheDocument();

    const empty = render(
      <ControlledDialog
        overrides={{ projectCount: 0, projectNames: [] }}
        onConfirm={vi.fn()}
      />
    );
    expect(empty.container.querySelector("input[type=checkbox]")).toBeNull();
  });
});
